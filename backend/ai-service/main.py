import os
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import joblib
import shap

load_dotenv()

app = FastAPI(title="CoalGuard AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
if not url or not key:
    raise RuntimeError("Supabase credentials not found in .env")

supabase: Client = create_client(url, key)

import math

try:
    ml_model = joblib.load('model.pkl')
    ml_explainer = joblib.load('explainer.pkl')
except Exception as e:
    ml_model = None
    ml_explainer = None

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000 # Radius of earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class AnalyzeMineResponse(BaseModel):
    mine_id: str
    risk_score: float
    risk_level: str
    flags: list[str]
    explanation: str
    ml_probability: float = None
    ml_top_factors: list[str] = []

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze/mine/{mine_id}", response_model=AnalyzeMineResponse)
def analyze_mine(mine_id: str):
    now = datetime.now(timezone.utc)
    date_180_days_ago = (now - timedelta(days=180)).isoformat()
    date_90_days_ago = (now - timedelta(days=90)).isoformat()

    # Query mine data
    m_res = supabase.table('mines').select('*').eq('id', mine_id).execute()
    mine_data = m_res.data[0] if m_res.data else {}
    mine_lat = mine_data.get('latitude', 0.0)
    mine_lng = mine_data.get('longitude', 0.0)
    mine_radius = mine_data.get('radius_m', 5000)

    # 1. Query violations (last 180 days) and compliance_items
    v_res = supabase.table('violations').select('*').eq('mine_id', mine_id).gte('created_at', date_180_days_ago).execute()
    violations = v_res.data or []

    c_res = supabase.table('compliance_items').select('*').eq('mine_id', mine_id).execute()
    compliance_items = c_res.data or []

    overdue_count = sum(1 for c in compliance_items if c.get('status') == 'overdue')

    severity_weight = 0
    recent_90d_violations = []
    location_anomaly = False
    
    # 2. Location anomaly check & Severity Weight
    for v in violations:
        if v.get('status') == 'open':
            sev = str(v.get('severity', '')).lower()
            if sev == 'critical': severity_weight += 10
            elif sev == 'high': severity_weight += 5
            elif sev == 'medium': severity_weight += 2
            elif sev == 'low': severity_weight += 1

        lat = v.get('latitude')
        lng = v.get('longitude')
        if lat and lng and mine_lat and mine_lng:
            dist = haversine(mine_lat, mine_lng, lat, lng)
            if dist > mine_radius:
                location_anomaly = True
                
        created_at_str = v.get('created_at')
        if created_at_str and created_at_str >= date_90_days_ago:
            recent_90d_violations.append(v)

    # 3. Within-site clustering (Hotspots)
    hotspot_flag = False
    hotspot_data = None
    recurring_category = None
    category_counts = {}

    for i in range(len(recent_90d_violations)):
        v1 = recent_90d_violations[i]
        
        # Track recurring categories
        cat = v1.get('category')
        if cat:
            category_counts[cat] = category_counts.get(cat, 0) + 1
            if category_counts[cat] >= 3:
                recurring_category = cat
                
        lat1, lng1 = v1.get('latitude'), v1.get('longitude')
        if not lat1 or not lng1: continue
        
        cluster = [v1]
        for j in range(i + 1, len(recent_90d_violations)):
            v2 = recent_90d_violations[j]
            lat2, lng2 = v2.get('latitude'), v2.get('longitude')
            if lat2 and lng2:
                dist = haversine(lat1, lng1, lat2, lng2)
                if dist <= 200:
                    cluster.append(v2)
                    
        if len(cluster) >= 3:
            hotspot_flag = True
            avg_lat = sum(c.get('latitude') for c in cluster) / len(cluster)
            avg_lng = sum(c.get('longitude') for c in cluster) / len(cluster)
            hotspot_data = {"count": len(cluster), "latitude": avg_lat, "longitude": avg_lng}
            break

    # 4. Time-pattern detection
    time_pattern = None
    if len(recent_90d_violations) >= 5:
        hour_counts = [0] * 24
        for v in recent_90d_violations:
            ts = v.get('timestamp') or v.get('created_at')
            if ts:
                try:
                    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    hour_counts[dt.hour] += 1
                except:
                    pass
        
        total_recent = len(recent_90d_violations)
        # Check sliding 4-hour windows
        for start_hr in range(24):
            window_count = sum(hour_counts[(start_hr + k) % 24] for k in range(4))
            if window_count / total_recent >= 0.6:
                if 5 <= start_hr <= 11:
                    time_pattern = 'morning-concentrated'
                elif 12 <= start_hr <= 16:
                    time_pattern = 'afternoon-concentrated'
                elif 17 <= start_hr <= 21:
                    time_pattern = 'evening-concentrated'
                else:
                    time_pattern = 'night-concentrated'
                break

    # 5. Risk score
    raw_score = (overdue_count * 5) + severity_weight + (25 if recurring_category else 0) + (15 if hotspot_flag else 0)
    risk_score = min(100.0, float(raw_score))

    if risk_score > 75:
        risk_level = "critical"
    elif risk_score >= 45:
        risk_level = "high"
    else:
        risk_level = "compliant"

    # 6. Explanations & Flags
    flags = []
    explanation = f"Flagged due to {overdue_count} overdue compliance items"
    if recurring_category:
        explanation += f" and a recurring pattern of {recurring_category} violations"
        flags.append(f"Recurring {recurring_category} violations")
    
    explanation += "."

    if hotspot_flag:
        explanation += f" {hotspot_data['count']} violations clustered within 200m at the site - possible localized hazard."
        flags.append("Spatial Hotspot Detected")
    
    if location_anomaly:
        explanation += " GPS coordinates for 1 or more recent violations fall outside the mine's registered boundary - flagged for verification."
        flags.append("Location Anomaly")
        
    if time_pattern:
        explanation += f" Incidents show a distinct {time_pattern} trend."
        flags.append(f"Time Pattern: {time_pattern}")

    if overdue_count > 0: flags.append(f"{overdue_count} overdue items")
    if severity_weight > 0: flags.append(f"Severity weight: {severity_weight}")

    contributing_factors = {
        "overdue_count": overdue_count,
        "severity_weight": severity_weight,
        "recurring_flag": bool(recurring_category),
        "category": recurring_category,
        "location_anomaly": location_anomaly,
        "hotspot": hotspot_data,
        "time_pattern": time_pattern
    }

    ml_probability = None
    ml_top_factors = []
    
    if ml_model and ml_explainer:
        vc_30 = sum(1 for v in violations if v.get('created_at', '') >= (now - timedelta(days=30)).isoformat())
        vc_90 = len(recent_90d_violations)
        
        open_v = [v for v in violations if v.get('status') == 'open']
        open_c = len(open_v)
        s_tot = 0
        for v in open_v:
            s = str(v.get('severity', '')).lower()
            if s == 'critical': s_tot += 10
            elif s == 'high': s_tot += 5
            elif s == 'medium': s_tot += 2
            elif s == 'low': s_tot += 1
        avg_sev = s_tot / open_c if open_c > 0 else 0
        
        total_c = len(compliance_items)
        overdue_ratio = overdue_count / total_c if total_c > 0 else 0
        
        last_i_dt = None
        i_res = supabase.table('inspections').select('*').eq('mine_id', mine_id).execute()
        for i in (i_res.data or []):
            dt_str = i.get('scheduled_date') or i.get('created_at')
            if dt_str:
                try:
                    dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                    if dt <= now:
                        if not last_i_dt or dt > last_i_dt:
                            last_i_dt = dt
                except:
                    pass
        days_since_i = (now - last_i_dt).days if last_i_dt else 365
        
        recurring_flag = 1 if recurring_category else 0
        
        contractor_inc = 0
        for v in violations:
            d = str(v.get('description', '')).lower()
            c = str(v.get('corrective_action', '')).lower()
            if 'contractor' in d or 'contractor' in c:
                contractor_inc += 1
                
        df_input = pd.DataFrame([{
            'violation_count_30d': vc_30,
            'violation_count_90d': vc_90,
            'avg_severity_score': avg_sev,
            'overdue_compliance_ratio': overdue_ratio,
            'days_since_last_inspection': min(days_since_i, 365),
            'recurring_category_flag': recurring_flag,
            'contractor_incident_count': contractor_inc
        }])
        
        prob = ml_model.predict_proba(df_input)[0][1]
        ml_probability = round(float(prob * 100), 1)
        
        shap_vals = ml_explainer.shap_values(df_input)
        sv = shap_vals[0]
        feature_names = list(df_input.columns)
        
        friendly_names = {
            'violation_count_30d': 'recent 30-day violations',
            'violation_count_90d': 'historical 90-day violations',
            'avg_severity_score': 'high average severity of open violations',
            'overdue_compliance_ratio': 'overdue safety compliance',
            'days_since_last_inspection': 'time since last inspection',
            'recurring_category_flag': 'recurring violation pattern',
            'contractor_incident_count': 'contractor-related incidents'
        }
        
        sorted_indices = np.argsort(np.abs(sv))[::-1]
        top_2 = sorted_indices[:2]
        ml_top_factors = [friendly_names[feature_names[i]] for i in top_2 if np.abs(sv[i]) > 0.01]
        
        contributing_factors["ml_probability"] = ml_probability
        contributing_factors["ml_top_factors"] = ml_top_factors

    payload = {
        "mine_id": mine_id,
        "score": risk_score,
        "risk_level": risk_level,
        "explanation": explanation,
        "contributing_factors": contributing_factors,
        "last_updated": now.isoformat()
    }

    existing = supabase.table('risk_scores').select('mine_id, risk_level').eq('mine_id', mine_id).execute()
    
    if existing.data:
        supabase.table('risk_scores').update(payload).eq('mine_id', mine_id).execute()
    else:
        supabase.table('risk_scores').insert(payload).execute()

    return {
        "mine_id": mine_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flags": flags,
        "explanation": explanation,
        "ml_probability": ml_probability,
        "ml_top_factors": ml_top_factors
    }

@app.post("/analyze/all")
def analyze_all_mines():
    import time
    response = supabase.table('mines').select('id').execute()
    mines = response.data or []
    
    tier_changes = 0
    analyzed = 0
    
    for m in mines:
        mine_id = m['id']
        try:
            # Fetch previous risk level first to check for changes
            existing = supabase.table('risk_scores').select('risk_level').eq('mine_id', mine_id).execute()
            prev_level = existing.data[0].get('risk_level') if existing.data else None
            
            res = analyze_mine(mine_id)
            
            if prev_level and prev_level != res['risk_level']:
                tier_changes += 1
            elif not prev_level: # new score created
                tier_changes += 1
                
            analyzed += 1
            time.sleep(0.1) # Prevent socket exhaustion on Windows
        except Exception as e:
            print(f"Error analyzing mine {mine_id}: {e}")
        
    return {
        "mines_analyzed": analyzed,
        "tier_changes": tier_changes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
