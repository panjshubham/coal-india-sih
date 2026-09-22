# ⛏️ CoalGuard (Khanan-Net) — Complete Project Knowledge Base & Architecture Manual
> **Context File for Local LLMs (LM Studio / Ollama / Local Models)**  
> **Repository:** CoalGuard / Khanan-Net — AI-Enabled Smart Governance & Predictive Safety Platform for Indian Coal Mines (DGMS CMR 2017)

---

## 1. Executive Summary & Problem Statement
* **Problem Statement:** Indian underground coal mining operations struggle with fragmented paper-based reporting, zero underground connectivity, catastrophic water inrushes, unmonitored PPE violations, and back-dated post-incident statutory registers.
* **Solution:** **CoalGuard (Khanan-Net)** is an offline-first, multi-modal governance and predictive safety platform designed under **DGMS CMR 2017** (Coal Mines Regulations 2017) and the **Mines Act 1952**.
* **Key Innovation:** A dual-mode hybrid architecture combining an offline Progressive Web App (PWA) with **IndexedDB Zero-Data-Loss**, **Sub-GHz LoRa (865 MHz)** mesh telemetry, a **10-Model FastAPI AI Microservice**, and a **SHA-256 Cryptographic Audit Ledger**.

---

## 2. Full-Stack System Architecture

### A. Frontend Layer (`/frontend`)
* **Core Technologies:** React 19.2, Vite 8.2, TypeScript, TailwindCSS v4, React-Leaflet v5 (CARTO Dark Matter & Satellite Imagery), Recharts, jsPDF + jsPDF-AutoTable, i18next.
* **Storage & Offline Engine:** IndexedDB (`idb` & `dexie`) + Service Workers (`vite-plugin-pwa`).
* **Real-time Streaming:** Supabase Realtime client subscribing to `postgres_changes` on the `violations`, `alerts`, and `inspections` tables.
* **Key Pages & Dashboards:**
  1. `CollieryManagerDashboard.tsx`: 2.5D spatial mine view, environmental gas telemetry pins (CH4, CO, Temp), workforce shift logs, and offline hazard reporting modal.
  2. `CorporateDashboard.tsx`: Executive command center with live WebSocket violations feed, cross-subsidiary risk scoring (ECL, BCCL, SECL, CCL), and GIS heatmaps.
  3. `RegulatorDashboard.tsx`: DGMS read-only audit portal with green "Hash Verified" SHA-256 checkmarks and 1-Click Form V PDF export.
  4. `BlastZoneLockdown.tsx`: Emergency blasting command center with 500m Haversine geofenced danger perimeter, 30-minute detonation countdown, and audio sirens.
  5. `WaterInrushAnalysis.tsx`: Hydrochemical risk interface with interactive TreeSHAP waterfall charts and ion sensitivity sliders.
  6. `PPELiveFeed.tsx` & `AIWorkbench.tsx`: Real-time CCTV detection monitor and interactive multi-modal testing lab (Voice, Vision, OCR).
  7. `StatutoryRegisters.tsx`: Complete digital registers for CMR 2017 (Forms I, II, III, IV, and V).

### B. Backend & Database Layer (`/backend`)
* **Database:** Supabase (PostgreSQL 16) with strict Row-Level Security (RLS) across user roles (`mine_official`, `corporate`, `regulator`).
* **Cryptographic Immutability:** `audit_ledger` table with PostgreSQL triggers calculating chained SHA-256 checksums:
  $$\text{Hash}_n = \text{SHA-256}(\text{Hash}_{n-1} + \text{Record JSON})$$
* **Automated Escalation Matrix (`backend/cron/dailyAlerts.js`):**
  - **2 Hours Unresolved:** Automatically escalates open critical hazards to Colliery General Manager.
  - **24 Hours Unresolved:** Automatically escalates statutory alerts to Subsidiary HQ.
  - **30 / 60 / 90 Days:** Triggers statutory compliance deadline warnings via email.
* **In-Premises Telemetry:** Mosquitto MQTT broker accepting RS485 and Armoured In-Mine LAN sensor payloads from the pit-bottom transceiver.

### C. AI & Machine Learning Microservice (`/ai-service`)
* **Framework:** Python 3.13 + FastAPI running asynchronously on port 8000 (`main.py`).
* **Dependencies:** PyTorch, Torchvision, Transformers (Hugging Face), Ultralytics (YOLOv8), XGBoost, SHAP, Scikit-learn, Pydantic, Uvicorn.
* **The 10 AI Engines:**
  1. **Edge Computer Vision (YOLOv8n-PPE):** Sub-45ms inference detecting hardhats, high-vis vests, and safety boots on CCTV/RTSP streams (`yolov8n-ppe.pt`).
  2. **Hydrochemical Water Inrush (CLSSA-XGBoost):** Analyzes 8 chemical ions (Ca²⁺, Mg²⁺, Na⁺, Cl⁻, SO₄²⁻, HCO₃⁻, pH, TDS) to predict catastrophic underground inundation in <1 second (`water_inrush_model.py`).
  3. **Explainable AI (TreeSHAP Waterfall):** Serialized SHAP explainer (`water_inrush_explainer.pkl`) returning exact mathematical feature attributions for regulatory transparency.
  4. **Speech-to-Text (Whisper Large v3):** Transcribes vernacular voice notes recorded underground by miners.
  5. **Vernacular Translation (IndicTrans2):** Translates Hindi, Odia, and Bengali voice logs into English statutory classifications.
  6. **Zero-Shot Hazard Classifier (BART-Large-MNLI):** Automatically categorizes unstructured text into DGMS hazard types (Roof Support, Inundation, Haulage, Ventilation).
  7. **Named Entity Extraction (BERT-NER):** Extracts critical parameters from reports (Seam number, shift timing, equipment IDs, locations).
  8. **Predictive Mine Safety Risk Index (XGBoost):** Composite safety regressor scoring mines from 0 to 100 based on 8 statutory parameters.
  9. **Document OCR & Digitization (TrOCR-large + Donut-base):** Converts legacy handwritten and printed Form V statutory logbooks into structured SQL records.
  10. **Dispatch Fraud Anomaly Detection (Isolation Forest):** Flags gross-tare weighbridge discrepancies and logistics mismatches.

---

## 3. End-to-End Data Workflows

### Workflow 1: Underground Offline Hazard Entry → Auto-Sync → Real-time Push
1. **Underground (No Internet):** Field supervisor opens PWA, records a hazard with category, severity, photo (Base64), voice note, and native GPS Proof-of-Presence coordinates.
2. **Local Buffer (`idb`):** Payload is stored in IndexedDB under `pending_submissions` (`status = 'pending'`).
3. **Surfacing / Wi-Fi Reconnect:** Browser triggers `online` event; `syncService.ts` fires `processSyncQueue()`.
4. **Cloud & AI Ingestion:** Photos upload to Supabase Storage; voice notes are transcribed via FastAPI Whisper; structured records insert into `public.violations`.
5. **Real-time Push:** Supabase WebSockets push the record to the Corporate Dashboard without page refresh.
6. **Cryptographic Locking:** PostgreSQL PL/pgSQL trigger chains the record into `audit_ledger` with SHA-256.

### Workflow 2: Environmental Telemetry → LoRa Mesh → Local Ring Buffer → MQTT
1. **Underground Sensor Nodes:** Stationary sensors measure CH₄, CO, and temperature; wearable miner trackers monitor SpO₂ and fall events.
2. **Sub-GHz LoRa (865 MHz):** Penetrates underground rock galleries to transmit telemetry across multi-hop relays.
3. **72-Hour Ring Buffer Node:** Embedded SQLite circular buffer caches telemetry if shaft cables are disconnected.
4. **Pit-Bottom Transceiver & LAN:** Transmits data up the vertical shaft via armoured industrial LAN/RS485 to the surface MQTT broker and Supabase database.

---

## 4. Key Differentiators for Presentation & Technical Evaluation
* **Offline-First Resilience:** Zero packet loss in air-gapped subterranean mines.
* **Statutory DGMS CMR 2017 Compliance:** Pre-configured rules, Form I–V registers, and 1-click PDF statutory exports.
* **Explainable AI (XAI):** TreeSHAP integration eliminates black-box AI objections from government auditors.
* **Multi-Tenant Scalability:** Single unified deployment supporting Coal India subsidiaries (ECL, BCCL, SECL, CCL).
* **Cryptographic Tamper-Proofing:** Guarantees immutable audit trails that cannot be retroactively altered after mine incidents.

---

## 5. Local Setup & Quick Execution Commands

### AI Microservice (Port 8000)
```powershell
cd "coal india/ai-service"
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
# OpenAPI Docs: http://localhost:8000/docs
```

### Frontend Application (Port 5173)
```powershell
cd "coal india/frontend"
npm install
npm run dev
# Web App: http://localhost:5173
```
