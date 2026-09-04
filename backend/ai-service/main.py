import os
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel
from dotenv import load_dotenv

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

class AnalyzeMineResponse(BaseModel):
    mine_id: int
    risk_score: float
    risk_level: str
    flags: list[str]
    explanation: str

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze/mine/{mine_id}", response_model=AnalyzeMineResponse)
def analyze_mine(mine_id: int):
    now = datetime.now(timezone.utc)
    date_180_days_ago = (now - timedelta(days=180)).isoformat()
    date_90_days_ago = (now - timedelta(days=90)).isoformat()

    # 1. Query violations (last 180 days) and compliance_items
    v_res = supabase.table('violations').select('*').eq('mine_id', mine_id).gte('created_at', date_180_days_ago).execute()
    violations = v_res.data or []

    c_res = supabase.table('compliance_items').select('*').eq('mine_id', mine_id).execute()
    compliance_items = c_res.data or []

    # 2. overdue_count
    overdue_count = sum(1 for c in compliance_items if c.get('status') == 'overdue')

    # 3. severity_weight across open violations
    severity_weight = 0
    for v in violations:
        if v.get('status') == 'open':
            sev = str(v.get('severity', '')).lower()
            if sev == 'critical': severity_weight += 10
            elif sev == 'high': severity_weight += 5
            elif sev == 'medium': severity_weight += 2
            elif sev == 'low': severity_weight += 1

    # 4. recurring_flag (category appears 3+ times in last 90 days)
    recurring_flag = False
    recurring_category = None
    category_counts = {}
    
    for v in violations:
        created_at_str = v.get('created_at')
        if not created_at_str: continue
        
        # Parse Supabase timestamp, handle python < 3.11 fromisoformat issues by taking first 19 chars if needed
        # Or simply string comparison since ISO format preserves order
        if created_at_str >= date_90_days_ago:
            cat = v.get('category')
            if cat:
                category_counts[cat] = category_counts.get(cat, 0) + 1
                if category_counts[cat] >= 3:
                    recurring_flag = True
                    recurring_category = cat
                    break

    # 5. risk_score
    raw_score = (overdue_count * 5) + severity_weight + (25 if recurring_flag else 0)
    risk_score = min(100.0, float(raw_score))

    # 6. risk_level
    if risk_score > 75:
        risk_level = "critical"
    elif risk_score >= 45:
        risk_level = "high"
    else:
        risk_level = "compliant"

    # 7. explanation
    explanation = f"Flagged due to {overdue_count} overdue compliance items"
    if recurring_flag:
        explanation += f" and a recurring pattern of {recurring_category} violations."
    else:
        explanation += "."

    # flags
    flags = []
    if overdue_count > 0: flags.append(f"{overdue_count} overdue items")
    if recurring_flag: flags.append(f"Recurring {recurring_category} violations")
    if severity_weight > 0: flags.append(f"Severity weight: {severity_weight}")

    # 8. Upsert into risk_scores
    contributing_factors = {
        "overdue_count": overdue_count,
        "severity_weight": severity_weight,
        "recurring_flag": recurring_flag,
        "category": recurring_category
    }

    payload = {
        "mine_id": mine_id,
        "score": risk_score,
        "risk_level": risk_level,
        "explanation": explanation,
        "contributing_factors": contributing_factors,
        "last_updated": now.isoformat()
    }

    # Use upsert based on mine_id. If mine_id is PK, upsert works directly.
    # Otherwise, check existing and update or insert.
    existing = supabase.table('risk_scores').select('mine_id, risk_level').eq('mine_id', mine_id).execute()
    
    prev_level = None
    if existing.data:
        prev_level = existing.data[0].get('risk_level')
        supabase.table('risk_scores').update(payload).eq('mine_id', mine_id).execute()
    else:
        supabase.table('risk_scores').insert(payload).execute()

    return {
        "mine_id": mine_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flags": flags,
        "explanation": explanation
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
