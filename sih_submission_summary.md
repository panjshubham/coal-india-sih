# Khanan-Net — SIH 2026 Submission Summary
## Problem Statement ID: SIH26024
### AI-Based Smart Governance and Compliance Monitoring System for Coal Mines

---

## 1. System Overview

**Khanan-Net** (खनन-नेट) is a centralized, AI-enabled smart governance platform for Indian coal mines, built to replace fragmented paper-based systems with a single digital ecosystem integrating:
- Real-time statutory compliance tracking
- Geo-tagged offline-first field inspections
- AI-powered predictive risk scoring
- Immutable cryptographic audit trails
- Automated escalation workflows

---

## 2. Complete System Workflow: Offline Hazard → Database → Escalation

```
FIELD INSPECTOR (Underground, No Network)
        │
        │  Opens CollieryManagerDashboard PWA
        │  → Taps "Report Hazard"
        │  → Fills: Category | Severity | Description
        │  → Captures GPS (Proof-of-Presence lock)
        │  → Optionally speaks (voice-to-text, multilingual)
        │
        ▼
  [IndexedDB / idb — LOCAL DEVICE STORAGE]
        │  Stored as: { type: 'violation', data: {...}, status: 'pending' }
        │  ← System is FULLY OFFLINE capable here
        │
  ─── Network Restored ──────────────────────────────
        │
        ▼
  [syncService.ts — Auto-Sync on 'online' event]
        │  Reads pending_submissions from IndexedDB
        │  POST → Supabase: public.violations table
        │
        ▼
  [PostgreSQL Trigger: critical_violation_trigger]
        │  IF severity IN ('high', 'critical'):
        │    INSERT → public.alerts table
        │    → Notifies all subscribed Realtime dashboard channels
        │
        ▼
  [audit_ledger Cryptographic Chain]
        │  Hash = SHA256(prev_hash + JSON.stringify(record))
        │  → Immutable, unchainable record written to audit_ledger
        │
        ▼
  [CRON: backend/cron/dailyAlerts.js — runs hourly]
        │  violations.status = 'open' AND created_at < (NOW - 2h)
        │    → Escalate to General Manager
        │  violations.status = 'open' AND created_at < (NOW - 24h)
        │    → Escalate to Subsidiary HQ
        │  compliance_items.due_date < (NOW + 30/60/90 days)
        │    → Email/SMS reminder
        │
        ▼
  [Corporate Dashboard — Real-Time Supabase Channel]
        │  Live Violations Feed updates instantly via postgres_changes
        │  Risk-ranked mines table with AI confidence scores
        │
        ▼
  [RegulatorDashboard — Read-Only Oversight]
        │  Certified Inspections table:
        │    ✅ "Hash Verified" badge + truncated SHA-256 per record
        │  "Export Form V (PDF)" → jsPDF statutory report
        │    Includes: violations + full audit chain hash log
```

---

## 3. Tech Stack Table

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 + Vite 8 | SPA with HMR for rapid UI development |
| **Styling** | TailwindCSS v4 | Utility-first dark-mode governance UI |
| **Routing** | React Router v7 | Role-based page routing (mine_official, corporate, regulator) |
| **Offline Storage** | `idb` (IndexedDB) | Offline hazard queue with auto-sync on reconnect |
| **PWA / Service Worker** | `vite-plugin-pwa` + Workbox | Offline-first Progressive Web App for field use |
| **Maps / GIS** | React-Leaflet + CARTO Dark Tiles | Geo-tagged mine locations with risk-colored markers |
| **Charts** | Recharts | Compliance metrics, production analytics charts |
| **PDF Generation** | jsPDF + jsPDF-AutoTable | Form V statutory report export (RegulatorDashboard) |
| **OCR (Frontend)** | Tesseract.js | Client-side OCR for legacy document digitization |
| **Internationalization** | i18next + react-i18next | Multilingual UI (Hindi, English, Odia, Bengali) |
| **Authentication** | Supabase Auth + RLS | Role-based access: mine_official, corporate, regulator |
| **Database** | PostgreSQL via Supabase | mines, violations, inspections, compliance_items |
| **Realtime** | Supabase Realtime (postgres_changes) | Live dashboard updates for violations feed |
| **Immutable Audit** | PostgreSQL audit_ledger + SHA-256 chains | Tamper-proof cryptographic compliance records |
| **Triggers** | PostgreSQL PL/pgSQL Triggers | Auto-insert alerts on high severity violations |
| **Backend / CRON** | Node.js + cron/dailyAlerts.js | Escalation matrix, deadline reminders |
| **Email Notifications** | Nodemailer | Compliance deadline alerts (30/60/90 day warnings) |
| **AI Engine** | Python 3.13 + FastAPI | Standalone ML microservice on port 8000 |
| **Risk Model** | Weighted Feature Scoring + Sigmoid | Mine Safety Risk Index (0–100, 8 DGMS features) |
| **Anomaly Detection** | Statistical threshold matching | Production vs. logistics weight discrepancy flagging |
| **OCR Pipeline (AI)** | Regex + pytesseract (production-ready) | Statutory form date extraction and expiry flagging |
| **Deployment** | Vercel (Frontend) + Supabase (DB) | Cloud-hosted, globally scalable, zero server maintenance |

---

## 4. User Personas & Access Routes

| Persona | URL Route | Key Features |
|---|---|---|
| **Colliery Manager** | `/dashboard/colliery` | Shift schedules, contractor check-ins, offline hazard reporting with GPS |
| **Mine Official** | `/dashboard/mine` | Compliance tracker, inspection log, PDF reports |
| **Corporate Exec** | `/dashboard/corporate` | Risk-ranked subsidiaries, AI insights, live violations feed |
| **Regulator (DGMS)** | `/dashboard/regulator` | Read-only view, hash-verified inspections, Form V PDF export |

---

## 5. Running the Demo (Quick Start)

### Step 1: Start AI Service
```bash
cd "coal india/ai-service"
.\venv\Scripts\uvicorn main:app --reload --port 8000
# Verify: open http://127.0.0.1:8000/docs (Swagger UI)
```

### Step 2: Start Frontend
```bash
cd "coal india/frontend"
npm run dev
# Opens: http://localhost:5173
```

### Step 3: Demo Scenarios for Jury

#### Scenario A — Offline Hazard Entry
1. Open Chrome DevTools → Network → Toggle **"Offline"**
2. Login as Mine Manager → Go to `/dashboard/colliery`
3. Click **"Report Hazard"** → Select "Critical" → Write description → Submit
4. Button shows **"Queue Offline"** → Pending count badge appears
5. Re-enable network → Auto-sync fires → Violation appears in Corporate Dashboard live feed

#### Scenario B — AI Risk Recalculation
1. Login as Corporate → `/dashboard/corporate`
2. Ensure AI service is on port 8000
3. Click **"Recalculate Risk Scores"**
4. Mines get updated scores with contributing factors & ML confidence %

#### Scenario C — Regulator Audit & Form V Export
1. Login as Regulator → `/dashboard/regulator`
2. Show **Certified Inspections** table with **"Hash Verified"** badge + SHA-256 hash
3. Click **"Export Form V (PDF)"** → statutory document downloads containing:
   - Violations table
   - Cryptographic audit trail
   - DGMS header + timestamp

#### Scenario D — OCR Document Upload
1. Go to **Data Import** page
2. Upload any JPG/PNG of a form → Shows extracted: document type, dates, expiry, alert flag

---

## 6. Key Differentiators for Jury

| Feature | Implementation | Why It Matters for SIH |
|---|---|---|
| **Offline-First** | IndexedDB + PWA Service Worker | Works underground with zero network |
| **GPS Proof-of-Presence** | Browser Geolocation API | Prevents fake inspection submissions |
| **Immutable Audit Trail** | SHA-256 chained hashes + DB triggers | Back-dating records is cryptographically impossible |
| **Form V Auto-Generation** | jsPDF with embedded audit chain | Eliminates manual statutory report preparation |
| **Multilingual Interface** | i18next (Hindi, English, Odia, Bengali) | Inclusive for remote field workers |
| **Real-Time Dashboard** | Supabase postgres_changes subscriptions | Corporate sees violations the moment they're filed |
| **AI Risk Score** | Weighted model with 8 DGMS-aligned features | Predictive, not reactive — flags risk before accidents |
| **Multi-Tenant Scalable** | Supabase RLS + role-based routing | One deployment scales across all CIL subsidiaries |

---

*Khanan-Net — SIH 2026, PS ID 26024 — Digital Governance for Indian Coal Mines*
