# CoalGuard / Khanan-Net — Solution Architecture Diagram Set

Separate from `system_architecture.mmd` (the hardware/LAN topology). This set answers
**“how do we solve the problem, using what, and what output do we get?”** — mapped to the
files that actually exist in this repo.

Every Mermaid block below was parsed with Mermaid v12, so each one is safe to paste into
<https://mermaid.live> or render in a Markdown preview.

| # | Diagram | Question it answers |
|---|---|---|
| 1 | Master solution architecture (`solution_architecture.mmd`) | Problem → what we use → output |
| 2 | AI engine internals | Which of the 10 models runs behind which route |
| 3 | End-to-end sequence | What physically happens from a sirdar's voice note to a manager alert |
| 4 | Data model (ER) | What is stored where |
| 5 | Real-time PPE vision pipeline | How a CCTV frame becomes a statutory violation |
| 6 | Deployment topology | What runs in the mine vs in the cloud |

---

## Diagram 2 — AI ENGINE INTERNALS (`ai-service/main.py`, FastAPI v4.0.0, 33 routes)

```mermaid
flowchart TB
  %% ─────────────────────────────────────────────────────────────
  %% CoalGuard — what runs behind every AI route
  %% ─────────────────────────────────────────────────────────────
  subgraph CALLERS["FRONTEND CALLERS — React 19 PWA"]
    direction LR
    C1["🔬 AI Workbench<br/>src/pages/AIWorkbench.tsx"]
    C2["💧 Water Inrush UI<br/>src/pages/WaterInrushAnalysis.tsx"]
    C3["👁️ PPE Live Feed<br/>src/pages/PPELiveFeed.tsx"]
    C4["📊 Corporate Dashboard<br/>src/pages/CorporateDashboard.tsx"]
    C5["📥 Offline queue flush<br/>src/lib/offlineQueue.ts"]
  end

  subgraph ROUTES["FASTAPI ROUTE GROUPS — ai-service/main.py"]
    direction TB
    R_PPE["👁️ VISION ROUTES<br/>/api/ppe-detect<br/>/api/pipeline/photo-inspection<br/>/api/ppe/live-event · /api/ppe/batch-events<br/>/api/ppe/events/MINE_ID<br/>/api/ppe/zone-stats/MINE_ID<br/>/api/ppe/cameras/MINE_ID<br/>/api/ppe/dashboard-summary/MINE_ID"]
    R_DOC["📄 DOCUMENT ROUTES<br/>/api/ocr-trocr<br/>/api/donut-extract<br/>/api/pipeline/document-process"]
    R_LANG["🎙️ LANGUAGE ROUTES<br/>/api/transcribe<br/>/api/translate<br/>/api/classify-compliance<br/>/api/extract-entities<br/>/api/pipeline/voice-report"]
    R_RISK["📈 PREDICTION ROUTES<br/>/api/predict-risk<br/>/api/detect-anomaly<br/>/analyze/mine/MINE_ID<br/>/analyze/all"]
    R_WI["💧 WATER INRUSH ROUTES<br/>/water-inrush/predict<br/>/water-inrush/shap-summary<br/>/water-inrush/status<br/>/water-inrush/train<br/>/water-inrush/train-csv"]
    R_AN["📊 ANALYTICS AND NEWS ROUTES<br/>/api/analytics/production-forecast<br/>/api/analytics/anomaly-detect<br/>/api/analytics/seasonal-risk-report<br/>/api/news/mining-intelligence<br/>/api/news/summarize-headline"]
    R_OPS["⚙️ OPS ROUTES<br/>/health · /api/hf-status · /"]
  end

  subgraph ENGINES["MODEL RUNTIMES"]
    direction TB
    E_LOCAL["🐍 LOCAL PYTHON RUNTIME<br/>Ultralytics YOLOv8n<br/>yolov8n-ppe.pt (6.2 MB)"]
    E_PKL["📦 LOCAL PICKLES<br/>water_inrush_model.pkl 0.6 MB<br/>water_inrush_explainer.pkl 1.2 MB<br/>water_inrush_scaler.pkl"]
    E_HF["☁️ HUGGING FACE INFERENCE API<br/>microsoft/trocr-large-printed<br/>naver-clova-ix/donut-base<br/>facebook/bart-large-mnli<br/>dslim/bert-base-NER<br/>ai4bharat/indictrans2-en-indic-dist-200M<br/>openai/whisper-large-v3"]
    E_S3["🪣 HF S3 COMPATIBLE STORAGE<br/>hub-ci.huggingface.co/s3<br/>audio and blob payloads"]
    E_FALLBACK["⚠️ DETERMINISTIC FALLBACK<br/>DGMS-calibrated rule engine<br/>used when a model is cold or absent"]
  end

  subgraph SINKS["STATE SINKS"]
    direction TB
    S_SUPA["🗄️ Supabase client<br/>ppe_events · risk_scores<br/>ENV: SUPABASE_URL + SUPABASE_KEY"]
    S_JSON["📤 JSON response to caller<br/>score · factors · SHAP values · tickets"]
  end

  C1 --> R_PPE
  C1 --> R_DOC
  C1 --> R_LANG
  C3 --> R_PPE
  C2 --> R_WI
  C4 --> R_RISK
  C5 --> R_LANG
  C5 --> R_DOC
  C5 --> R_PPE

  R_PPE --> E_LOCAL
  R_PPE --> S_SUPA
  R_DOC --> E_HF
  R_LANG --> E_HF
  R_LANG --> E_S3
  R_WI --> E_PKL
  R_AN --> E_HF
  R_RISK --> E_FALLBACK
  R_RISK --> S_SUPA
  C2 --> R_AN
  C4 --> R_AN

  E_LOCAL --> S_JSON
  E_PKL --> S_JSON
  E_HF --> S_JSON
  E_HF --> E_FALLBACK

  classDef caller fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#eef2ff;
  classDef route fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f0fdf4;
  classDef model fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fffbeb;
  classDef sink fill:#0f2942,stroke:#38bdf8,stroke-width:2px,color:#f0f9ff;
  class C1,C2,C3,C4,C5 caller;
  class R_PPE,R_DOC,R_LANG,R_RISK,R_WI,R_AN,R_OPS route;
  class E_LOCAL,E_PKL,E_HF,E_S3,E_FALLBACK model;
  class S_SUPA,S_JSON sink;
```

> **Two honest caveats visible in the code:** `ai-service/model.pkl` and `explainer.pkl` are
> absent from this folder (they only exist in the legacy copy `backend/ai-service/`), so the
> XGBoost branch of `/api/predict-risk` never fires and the DGMS-calibrated fallback returns the
> score. And `ai-service/.env` has no `SUPABASE_URL`/`SUPABASE_KEY`, so `/analyze/all` returns a
> hard-coded `"status": "simulated"` payload and the PPE ingestion routes cannot persist.

---

## Diagram 3 — END-TO-END SEQUENCE (offline voice hazard → manager alert)

```mermaid
sequenceDiagram
    autonumber
    participant S as Sirdar or field inspector
    participant PWA as React PWA offline
    participant IDB as IndexedDB queue
    participant NET as LAN or WiFi heartbeat
    participant AI as FastAPI AI engine port 8000
    participant HF as Hugging Face Inference
    participant DB as Supabase Postgres
    participant MGR as Colliery manager cockpit
    participant REG as DGMS regulator portal
    participant CRON as Escalation cron and SMTP

    Note over S,PWA: Underground — no cellular signal at all
    S->>PWA: taps Voice Note and speaks in Hindi
    PWA->>IDB: queueInspection voice blob plus GPS fix
    IDB-->>PWA: row stored with status queued and retry_count 0
    PWA-->>S: ConnectivityBadge shows 1 pending item

    Note over NET,AI: Worker surfaces — LAN heartbeat returns
    NET->>IDB: online event fires syncOfflineQueue
    IDB->>AI: POST /api/pipeline/voice-report
    AI->>HF: whisper-large-v3 speech to text
    HF-->>AI: Hindi transcript
    AI->>HF: indictrans2-en-indic-dist-200M translate to English
    HF-->>AI: English text
    AI->>HF: bart-large-mnli zero-shot classify hazard category
    HF-->>AI: category such as Roof Support
    AI->>HF: bert-base-NER extract officer mine date deadline
    HF-->>AI: structured entities
    AI->>DB: insert hazard and violation rows
    AI-->>IDB: 200 OK
    IDB->>IDB: mark synced then remove payload
    DB-->>MGR: Supabase Realtime pushes the new alert
    MGR->>DB: approves corrective action and closes violation
    DB-->>REG: read-only hash verified statutory record
    CRON->>DB: nightly sweep for overdue and stale items
    CRON-->>MGR: escalation email after 2 h then 24 h to HQ
```

---

## Diagram 4 — DATA MODEL (what is stored where)

```mermaid
erDiagram
  mines ||--o{ users : "assigned_mine_id"
  mines ||--o{ violations : "mine_id"
  mines ||--o{ inspections : "mine_id"
  mines ||--o{ compliance_items : "mine_id"
  mines ||--|| risk_scores : "mine_id is the PK"
  mines ||--o{ statutory_registers : "mine_id"
  mines ||--o{ ppe_cameras : "mine_id"
  ppe_cameras ||--o{ ppe_events : "camera_id"
  users ||--o{ violations : "approved_by"
  inspections ||--o{ violations : "inspection_id"
  contractors ||--o{ contractor_incidents : "contractor_id"
  violations ||--o{ contractor_incidents : "violation_id"

  mines {
    int id PK
    varchar name
    varchar type
    varchar subsidiary
    numeric lat
    numeric lng
    int radius_m
    text state
    text status
  }
  users {
    uuid id PK
    text name
    text email
    user_role role
    int assigned_mine_id FK
  }
  violations {
    int id PK
    int mine_id FK
    int inspection_id FK
    varchar regulation_ref
    text description
    varchar status
    varchar severity
    text category
    double latitude
    double longitude
    text corrective_action
    uuid approved_by FK
    varchar tracking_id
  }
  statutory_registers {
    int id PK
    int mine_id FK
    varchar register_type
    varchar shift
    varchar seam_or_pit
    varchar inspector_name
    jsonb parameters
    varchar compliance_status
    varchar statutory_regulation
    varchar hash
    varchar prev_hash
  }
  audit_ledger {
    int id PK
    varchar table_name
    int record_id
    varchar action
    text data_hash
    text prev_hash
    jsonb old_values
    jsonb new_values
    uuid user_id
  }
  ppe_cameras {
    uuid id PK
    uuid mine_id FK
    text camera_id
    text zone
    text rtsp_url
    bool is_active
  }
  ppe_events {
    uuid id PK
    uuid mine_id FK
    text camera_id
    text zone
    int person_count
    int violation_count
    text_array missing_ppe
    float confidence
    text severity
    bool is_resolved
    text snapshot_url
    bool alert_sent
  }
  risk_scores {
    int mine_id PK
    double score
    text risk_level
    text explanation
    jsonb contributing_factors
  }
  alerts {
    uuid id PK
    text type
    int related_entity_id
    text message
    text severity
    bool is_read
  }
  support_tickets {
    uuid id PK
    uuid user_id FK
    text role
    text subject
    text category
    text status
  }
```

> **Real schema risk worth fixing:** `ppe_cameras.mine_id` / `ppe_events.mine_id` are declared
> `UUID REFERENCES public.mines(id)`, but `mines.id` is an **integer** (per the live DB schema).
> That insert path fails unless the PPE tables are cast to `int` or the module is fed synthetic
> UUID mine ids.

---

## Diagram 5 — REAL-TIME PPE VISION PIPELINE (frame → statutory violation)

```mermaid
flowchart LR
  subgraph EDGE["① IN-MINE EDGE"]
    direction TB
    CAM["📹 CCTV / RTSP camera<br/>one row per camera in ppe_cameras"]
    MON["🐍 backend/camera_monitor.py<br/>async worker pool, frame sampling"]
    BAT["📦 event batcher<br/>BATCH_SIZE events per request"]
  end

  subgraph ENGI["② AI ENGINE — FastAPI"]
    direction TB
    DET["👁️ POST /api/ppe-detect<br/>YOLOv8n yolov8n-ppe.pt"]
    TRI["🧠 compliance triage<br/>helmet / safety vest / boots<br/>person_count vs violation_count"]
  end

  subgraph STORE["③ PERSISTENCE"]
    direction TB
    BULK["POST /api/ppe/batch-events<br/>insert into ppe_events"]
    LIVE["POST /api/ppe/live-event<br/>single-event fast path"]
    SNAP["🖼️ snapshot upload<br/>Supabase Storage bucket photos"]
  end

  subgraph VIS["④ OUTPUT"]
    direction TB
    ZS["GET /api/ppe/zone-stats/MINE_ID<br/>compliance % per zone, last 24 h"]
    SUM["GET /api/ppe/dashboard-summary/MINE_ID<br/>KPI roll-up for the cockpit"]
    FEED["👁️ PPE Live Feed page<br/>src/pages/PPELiveFeed.tsx"]
    ALC["🚨 AlertBell + alerts table<br/>critical breach escalates to mail"]
    VIO["⛏️ violation ticket<br/>feeds Violations + audit_ledger"]
  end

  CAM --> MON
  MON -->|"JPEG frame, octet-stream"| DET
  DET --> TRI
  TRI -->|"batch"| BAT
  TRI -->|"immediate"| LIVE
  BAT --> BULK
  BULK --> SNAP
  SNAP --> ZS
  BULK --> ZS
  ZS --> SUM
  SUM --> FEED
  BULK --> ALC
  BULK --> VIO
  VIO --> FEED

  classDef edge fill:#0f2942,stroke:#38bdf8,stroke-width:2px,color:#f0f9ff;
  classDef eng fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fffbeb;
  classDef st fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f0fdf4;
  classDef out fill:#312e81,stroke:#818cf8,stroke-width:2px,color:#eef2ff;
  class CAM,MON,BAT edge;
  class DET,TRI eng;
  class BULK,LIVE,SNAP st;
  class ZS,SUM,FEED,ALC,VIO out;
```

> **Production break to note:** `PPELiveFeed.tsx` hard-codes `AI_BASE = 'http://127.0.0.1:8000'`
> and `MINE_ID = '1'`. On the Vercel deployment that points at the *visitor's own machine*, so the
> PPE feed only works in the local LAN demo — it needs `VITE_AI_SERVICE_URL` plus the real mine id
> from the auth context.

---

## Diagram 6 — DEPLOYMENT TOPOLOGY (what runs where)

```mermaid
flowchart TB
  subgraph ONPREM["① IN-MINE / ON-PREM — must work with no internet"]
    direction LR
    TAB["📱 Tablet or phone<br/>CoalGuard PWA<br/>IndexedDB queue + GPS"]
    PITPC["🖥️ Pit-bottom PC<br/>camera_monitor.py daemon"]
    AILOCAL["🐍 AI service<br/>uvicorn 127.0.0.1:8000<br/>yolov8n-ppe.pt + water-inrush pickles"]
    CAMS["📹 IP cameras<br/>RTSP streams"]
    CAMS --> PITPC
    PITPC -->|"frames + events"| AILOCAL
    TAB -->|"LAN / WiFi heartbeat sync"| AILOCAL
  end

  subgraph CLOUD["② CLOUD — Vercel + Supabase"]
    direction LR
    VERCEL["▲ Vercel CDN<br/>frontend/dist static PWA<br/>SPA rewrites + camera/mic headers"]
    SUPA["🟢 Supabase<br/>Postgres 16 · Auth · Storage<br/>Realtime WebSockets · RLS"]
    JOBS["⏰ Node cron worker<br/>backend/cron/dailyAlerts.js<br/>nodemailer to SMTP"]
  end

  subgraph EXT["③ EXTERNAL AI BACKENDS — need outbound internet"]
    HFAPI["☁️ Hugging Face Inference API<br/>Whisper-v3 · IndicTrans2 · BART-MNLI<br/>BERT-NER · TrOCR · Donut"]
    HFS3["🪣 HF S3-compatible bucket<br/>audio and blob payloads"]
  end

  AILOCAL -->|"HTTPS writes with service key"| SUPA
  AILOCAL -->|"HTTPS inference"| HFAPI
  AILOCAL --> HFS3
  VERCEL -->|"supabase-js + anon key + RLS"| SUPA
  SUPA -->|"Realtime push"| VERCEL
  SUPA --> JOBS
  JOBS -->|"escalation email"| VERCEL

  classDef onprem fill:#0f2942,stroke:#38bdf8,stroke-width:2px,color:#f0f9ff;
  classDef cloud fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f0fdf4;
  classDef ext fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fffbeb;
  class TAB,PITPC,AILOCAL,CAMS onprem;
  class VERCEL,SUPA,JOBS cloud;
  class HFAPI,HFS3 ext;
```

---

## THE OUTPUT MATRIX — what we get, for whom, under which statute

| Output we deliver | Who receives it | Where it lives in code | Statute / rule it satisfies |
|---|---|---|---|
| GIS risk heatmap + subsidiary roll-up | CIL / subsidiary HQ (corporate) | `pages/CorporateDashboard.tsx`, `pages/GeospatialMap.tsx` | Mines Act 1952 §18 management oversight |
| Live hazard, methane, manpower cockpit | Colliery manager (`mine_official`) | `pages/CollieryManagerDashboard.tsx` | CMR 2017 Reg. 70 daily inspection and danger reporting |
| Risk score 0–100 + SHAP factor breakdown | Safety officer / HQ | `/api/predict-risk`, `components/RiskExplanationModal.tsx` | DGMS predictive vigilance, explainable AI |
| Water-inrush source prediction + TreeSHAP waterfall | Mine geologist / manager | `/water-inrush/predict`, `pages/WaterInrushAnalysis.tsx` | CMR 2017 Reg. 129 inundation precaution |
| Hash-chained statutory shift register (Form IV/V) | DGMS inspector + manager | `pages/StatutoryRegisters.tsx`, `statutory_registers`, `audit_ledger` | CMR 2017 Reg. 104/105/149, tamper-evident record |
| Read-only regulator portal with verified hashes | DGMS (regulator) | `pages/RegulatorDashboard.tsx`, `pages/AuditLog.tsx` | Mines Act 1952 §22/23, DGMS circulars |
| PPE violation tickets + zone compliance % | Manager, safety officer, contractor | `pages/PPELiveFeed.tsx`, `ppe_events`, `components/AlertBell.tsx` | PPE rules, CMR 2017 |
| Escalation emails (2 h manager → 24 h HQ) | Manager, then subsidiary HQ | `backend/cron/dailyAlerts.js`, `alerts` table | Time-bound statutory escalation |
| Blast zone lockdown + geofenced evacuation | All workers in the zone | `pages/BlastZoneLockdown.tsx`, `mines.radius_m` | Blasting precautions and evacuation drill |
| 1-click Form V PDF / XLSX export | DGMS, auditors | jsPDF + autotable, `xlsx` | Statutory Form V submission |
| Public transparency page | Citizens, RTI applicants | `pages/PublicTracking.tsx` | Public accountability |
| Grievance tickets with resolution trail | Worker → admin → regulator | `pages/HelpSupport.tsx`, `support_tickets` | Grievance redressal |
| Vernacular voice reporting (Hindi, Odia, Bengali) | Underground worker (cannot type) | `lib/offlineQueue.ts`, `/api/pipeline/voice-report`, `src/i18n.ts` | Inclusive compliance reporting |

---

### How to render

- **Individual diagram:** copy any fenced block into <https://mermaid.live>.
- **Whole file:** open in VS Code with a Mermaid Markdown preview extension, or paste into GitHub
  (GitHub renders `mermaid` fenced blocks natively).
- **Master diagram:** `presentation_assets/solution_architecture.mmd` (pure Mermaid, no fences) —
  drag it straight into mermaid.live.



