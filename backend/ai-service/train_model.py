import os
import math
import pandas as pd
import numpy as np
import xgboost as xgb
import shap
import joblib
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

print("Fetching data from Supabase...")
# Fetch data
m_res = supabase.table('mines').select('*').execute()
v_res = supabase.table('violations').select('*').execute()
c_res = supabase.table('compliance_items').select('*').execute()
i_res = supabase.table('inspections').select('*').execute()
rs_res = supabase.table('risk_scores').select('*').execute()

mines = m_res.data or []
violations = v_res.data or []
compliance_items = c_res.data or []
inspections = i_res.data or []
risk_scores = {r['mine_id']: r for r in (rs_res.data or [])}

now = datetime.now(timezone.utc)
date_30d = now - timedelta(days=30)
date_90d = now - timedelta(days=90)
date_180d = now - timedelta(days=180)

def parse_date(d_str):
    if not d_str: return None
    try:
        dt = datetime.fromisoformat(d_str.replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except:
        return None

# Build feature set
print("Building feature table...")
features_list = []
labels = []
mine_ids = []

for m in mines:
    mine_id = m['id']
    mine_v = [v for v in violations if v.get('mine_id') == mine_id]
    mine_c = [c for c in compliance_items if c.get('mine_id') == mine_id]
    mine_i = [i for i in inspections if i.get('mine_id') == mine_id]

    # violation_count_30d / 90d
    vc_30 = 0
    vc_90 = 0
    sev_total = 0
    open_count = 0
    recurring_cats = {}
    contractor_incident_count = 0

    for v in mine_v:
        dt = parse_date(v.get('created_at'))
        if dt:
            if dt >= date_30d: vc_30 += 1
            if dt >= date_90d: vc_90 += 1
        
        # severity
        if v.get('status') == 'open':
            open_count += 1
            sev = str(v.get('severity', '')).lower()
            if sev == 'critical': sev_total += 10
            elif sev == 'high': sev_total += 5
            elif sev == 'medium': sev_total += 2
            elif sev == 'low': sev_total += 1
        
        # recurring category (last 90d)
        if dt and dt >= date_90d:
            cat = v.get('category')
            if cat:
                recurring_cats[cat] = recurring_cats.get(cat, 0) + 1
        
        # contractor
        desc = str(v.get('description', '')).lower()
        corr = str(v.get('corrective_action', '')).lower()
        if 'contractor' in desc or 'contractor' in corr:
            contractor_incident_count += 1

    avg_sev = sev_total / open_count if open_count > 0 else 0
    recurring_flag = 1 if any(count >= 3 for count in recurring_cats.values()) else 0

    # compliance ratio
    total_c = len(mine_c)
    overdue_c = sum(1 for c in mine_c if c.get('status') == 'overdue')
    overdue_ratio = overdue_c / total_c if total_c > 0 else 0

    # days since last inspection
    last_i_dt = None
    for i in mine_i:
        dt = parse_date(i.get('scheduled_date') or i.get('created_at'))
        if dt and dt <= now:
            if not last_i_dt or dt > last_i_dt:
                last_i_dt = dt
    days_since_i = (now - last_i_dt).days if last_i_dt else 365

    # Target Label
    # We use existing risk_scores table as proxy. If > 75 (critical), it's a 1.
    rs = risk_scores.get(mine_id)
    rs_val = rs.get('score', 0) if rs else 0
    label = 1 if rs_val > 75 else 0
    
    # If mine has a lot of violations, let's artificially ensure it's labeled 1 to represent our seeded high-risk mines
    if vc_90 >= 5:
        label = 1

    features_list.append({
        'violation_count_30d': vc_30,
        'violation_count_90d': vc_90,
        'avg_severity_score': avg_sev,
        'overdue_compliance_ratio': overdue_ratio,
        'days_since_last_inspection': min(days_since_i, 365),
        'recurring_category_flag': recurring_flag,
        'contractor_incident_count': contractor_incident_count
    })
    labels.append(label)
    mine_ids.append(mine_id)

df = pd.DataFrame(features_list)
y = np.array(labels)

print(f"Dataset built: {len(df)} rows. {sum(y)} high-risk labels.")

# Train XGBoost
print("Training XGBoost Classifier...")
model = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42, scale_pos_weight=20, eval_metric='logloss')
model.fit(df, y)

accuracy = (model.predict(df) == y).mean()
print(f"Training Accuracy: {accuracy * 100:.2f}%")

# Feature Importance
print("\nFeature Importances (XGBoost Native):")
importances = model.feature_importances_
for col, imp in zip(df.columns, importances):
    print(f"  {col}: {imp:.4f}")

# SHAP Explainability
print("\nComputing SHAP values...")
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(df)

# Summarize SHAP
mean_shap = np.abs(shap_values).mean(axis=0)
print("\nGlobal SHAP Feature Importance:")
for col, imp in zip(df.columns, mean_shap):
    print(f"  {col}: {imp:.4f}")

# Save Model & Explainer
joblib.dump(model, 'model.pkl')
joblib.dump(explainer, 'explainer.pkl')
print("\nSaved model.pkl and explainer.pkl successfully.")
