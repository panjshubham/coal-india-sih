# PROJECT_SPEC_FOR_NATIVE_PORT

This document outlines the complete data layer, routing, backend AI logic, and Supabase integration to facilitate a port of this web application to a native platform (Android/Java/Kotlin or iOS).

## 1. FULL DATABASE SCHEMA

### Table: `compliance_items`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('compliance_items_id_seq'::regclass)
- `mine_id` (integer) NULL
- `category` (text) NOT NULL
- `title` (text) NOT NULL
- `due_date` (date) NOT NULL
- `status` (text) NOT NULL DEFAULT 'pending'::text
- `assigned_to` (uuid) NULL
- `document_url` (text) NULL
- `created_at` (timestamp with time zone) NULL DEFAULT now()
- `tracking_id` (character varying) NULL

**Constraints / Foreign Keys:**
- `mine_id` -> `public.mines(id)` (compliance_items_mine_id_fkey)
- PRIMARY KEY on `id` (compliance_items_pkey)
- UNIQUE on `tracking_id` (compliance_items_tracking_id_key)

### Table: `users`
**Columns:**
- `id` (uuid) NOT NULL
- `name` (text) NOT NULL DEFAULT ''::text
- `email` (text) NOT NULL
- `role` (USER-DEFINED 'user_role') NOT NULL DEFAULT 'mine_official'::user_role
- `assigned_mine_id` (integer) NULL
- `created_at` (timestamp with time zone) NULL DEFAULT now()

**Constraints / Foreign Keys:**
- `assigned_mine_id` -> `public.mines(id)` (users_assigned_mine_id_fkey)
- UNIQUE on `email` (users_email_key)
- PRIMARY KEY on `id` (users_pkey)

### Table: `mines`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('mines_id_seq'::regclass)
- `name` (character varying) NOT NULL
- `type` (character varying) NOT NULL
- `subsidiary` (character varying) NOT NULL
- `lat` (numeric) NULL
- `lng` (numeric) NULL
- `radius_m` (integer) NULL DEFAULT 500
- `region` (text) NULL
- `state` (text) NULL
- `latitude` (double precision) NULL
- `longitude` (double precision) NULL
- `status` (text) NULL DEFAULT 'active'::text

**Constraints / Foreign Keys:**
- PRIMARY KEY on `id` (mines_pkey)

### Table: `sync_events`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('sync_events_id_seq'::regclass)
- `client_uuid` (uuid) NOT NULL
- `endpoint` (character varying) NOT NULL
- `payload` (jsonb) NOT NULL
- `created_at` (timestamp without time zone) NULL DEFAULT now()

**Constraints / Foreign Keys:**
- UNIQUE on `client_uuid` (sync_events_client_uuid_key)
- PRIMARY KEY on `id` (sync_events_pkey)

### Table: `audit_ledger`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('audit_ledger_id_seq'::regclass)
- `table_name` (character varying) NOT NULL
- `record_id` (integer) NOT NULL
- `action` (character varying) NOT NULL
- `data_hash` (text) NOT NULL
- `prev_hash` (text) NULL
- `created_at` (timestamp without time zone) NULL DEFAULT now()
- `user_id` (uuid) NULL
- `old_values` (jsonb) NULL
- `new_values` (jsonb) NULL

**Constraints / Foreign Keys:**
- PRIMARY KEY on `id` (audit_ledger_pkey)

### Table: `alerts`
**Columns:**
- `id` (uuid) NOT NULL DEFAULT gen_random_uuid()
- `type` (text) NOT NULL
- `related_entity_id` (integer) NOT NULL
- `message` (text) NOT NULL
- `severity` (text) NOT NULL
- `is_read` (boolean) NOT NULL DEFAULT false
- `created_at` (timestamp with time zone) NULL DEFAULT now()

**Constraints / Foreign Keys:**
- PRIMARY KEY on `id` (alerts_pkey)

### Table: `inspections`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('inspections_id_seq'::regclass)
- `mine_id` (integer) NULL
- `contractor_id` (integer) NULL
- `date` (timestamp without time zone) NOT NULL DEFAULT now()
- `inspector_name` (character varying) NOT NULL
- `synced_at` (timestamp without time zone) NULL DEFAULT now()
- `tracking_id` (character varying) NULL

**Constraints / Foreign Keys:**
- `contractor_id` -> `public.contractors(id)` (inspections_contractor_id_fkey)
- `mine_id` -> `public.mines(id)` (inspections_mine_id_fkey)
- PRIMARY KEY on `id` (inspections_pkey)
- UNIQUE on `tracking_id` (inspections_tracking_id_key)

### Table: `risk_scores`
**Columns:**
- `mine_id` (integer) NOT NULL
- `score` (double precision) NOT NULL
- `risk_level` (text) NOT NULL
- `last_updated` (timestamp with time zone) NULL DEFAULT now()
- `id` (integer) NOT NULL DEFAULT nextval('risk_scores_id_seq'::regclass)
- `explanation` (text) NULL
- `contributing_factors` (jsonb) NULL

**Constraints / Foreign Keys:**
- `mine_id` -> `public.mines(id)` (fk_risk_scores_mine)
- PRIMARY KEY on `mine_id` (risk_scores_pkey)

### Table: `contractors`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('contractors_id_seq'::regclass)
- `name` (character varying) NOT NULL
- `license_no` (character varying) NOT NULL
- `license_expiry` (date) NOT NULL
- `document_url` (text) NULL

**Constraints / Foreign Keys:**
- PRIMARY KEY on `id` (contractors_pkey)

### Table: `contractor_incidents`
**Columns:**
- `id` (uuid) NOT NULL DEFAULT gen_random_uuid()
- `contractor_id` (integer) NOT NULL
- `violation_id` (integer) NULL
- `severity` (text) NOT NULL
- `date` (date) NOT NULL
- `created_at` (timestamp with time zone) NULL DEFAULT now()

**Constraints / Foreign Keys:**
- `contractor_id` -> `public.contractors(id)` (contractor_incidents_contractor_id_fkey)
- PRIMARY KEY on `id` (contractor_incidents_pkey)
- `violation_id` -> `public.violations(id)` (contractor_incidents_violation_id_fkey)

### Table: `violations`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('violations_id_seq'::regclass)
- `mine_id` (integer) NULL
- `inspection_id` (integer) NULL
- `regulation_ref` (character varying) NOT NULL
- `description` (text) NOT NULL
- `status` (character varying) NULL DEFAULT 'OPEN'::character varying
- `severity` (character varying) NULL DEFAULT 'MEDIUM'::character varying
- `created_at` (timestamp without time zone) NULL DEFAULT now()
- `escalated_at` (timestamp without time zone) NULL
- `photo_url` (text) NULL
- `latitude` (double precision) NULL
- `longitude` (double precision) NULL
- `corrective_action` (text) NULL
- `closed_at` (timestamp with time zone) NULL
- `approved_by` (uuid) NULL
- `approved_at` (timestamp with time zone) NULL
- `category` (text) NULL
- `tracking_id` (character varying) NULL

**Constraints / Foreign Keys:**
- `inspection_id` -> `public.inspections(id)` (violations_inspection_id_fkey)
- `mine_id` -> `public.mines(id)` (violations_mine_id_fkey)
- PRIMARY KEY on `id` (violations_pkey)
- UNIQUE on `tracking_id` (violations_tracking_id_key)

### Table: `statutory_registers`
**Columns:**
- `id` (integer) NOT NULL DEFAULT nextval('statutory_registers_id_seq'::regclass)
- `mine_id` (integer) NOT NULL
- `register_type` (character varying) NOT NULL
- `shift` (character varying) NOT NULL
- `seam_or_pit` (character varying) NOT NULL
- `inspector_name` (character varying) NOT NULL
- `inspector_role` (character varying) NOT NULL
- `parameters` (jsonb) NOT NULL DEFAULT '{}'::jsonb
- `compliance_status` (character varying) NOT NULL DEFAULT 'COMPLIANT'::character varying
- `statutory_regulation` (character varying) NOT NULL
- `remarks` (text) NULL
- `latitude` (double precision) NULL
- `longitude` (double precision) NULL
- `hash` (character varying) NULL
- `prev_hash` (character varying) NULL
- `created_at` (timestamp with time zone) NULL DEFAULT now()

**Constraints / Foreign Keys:**
- PRIMARY KEY on `id` (statutory_registers_pkey)

## 2. ROW LEVEL SECURITY POLICIES

- **Table `users`:**
  - `Allow authenticated delete users` (DELETE, roles: public, using: `true`)
  - `Allow authenticated insert users` (INSERT, roles: public, check: `true`)
  - `Allow authenticated update users` (UPDATE, roles: public, using: `true`)
  - `Allow read users` (SELECT, roles: public, using: `true`)
- **Table `audit_ledger`:** 
  - `Allow read audit_ledger` (SELECT, roles: public, using: `true`)
- **Table `risk_scores`:**
  - `Allow read risk_scores` (SELECT, roles: public, using: `true`)
- **Table `statutory_registers`:**
  - `statutory_allow_all` (ALL, roles: anon, authenticated, using: `true`, check: `true`)
- *(Note: All other tables currently rely on public schema access / unconstrained row access in the default setup unless explicitly restricted on Supabase dashboard).*

## 3. AUTHENTICATION FLOW - COMPLETE

- **Sign-in Method:** Email and password utilizing `supabase.auth.signInWithPassword()`. Pre-seeded accounts are heavily used for roles (corporate@coalguard.demo, regulator@coalguard.demo, mine_official@coalguard.demo).
- **Session/Token Handling:** Governed entirely by Supabase `auth-token` stored in local storage and managed via `supabase.auth.onAuthStateChange`.
- **Role Fetching:** On successful login or active session detection, the AuthProvider fetches the `role` from the `public.users` table matching the Auth `session.user.id`. 
- **Role Redirection & Blocking:** 
  - The router (`App.tsx`) protects core layouts with `ProtectedRoute`.
  - `ProtectedRoute` checks if the `role` fetched from context matches `allowedRoles` array passed as props. If the user's role is not authorized, they are redirected to their default fallback dashboard (`/dashboard/colliery` or `/dashboard/corporate`).

## 4. EVERY PAGE AND ITS DATA REQUIREMENTS

1. **Landing:** Public hero page. No auth required. No data fetched.
2. **Login:** Unauthenticated. Calls `supabase.auth.signInWithPassword`.
3. **CollieryManagerDashboard:** Fetches `mines`, `compliance_items` (where mine_id matches), `inspections`, `violations` (where mine_id matches). Inserts `violations` and `alerts` (on quick reporting).
4. **CorporateDashboard:** Fetches aggregates across all `mines`, `inspections`, `violations`, `compliance_items`. Fetches `contractors`. Updates `violations` (grants approvals).
5. **RegulatorDashboard:** Similar fetch requirements as Corporate, but strictly read-only.
6. **GeospatialMap:** Fetches `mines` and `violations` to plot coordinates on map layers.
7. **Compliance:** Fetches `compliance_items`. Filters by status and due_date. Updates status.
8. **Violations:** Fetches `violations` and joins with `mines`. UI states: Open, In Progress, Closed. 
9. **ViolationDetail:** Fetches a single `violation` by ID, joins `mines` and `users` (for approver email). Updates `status`, `corrective_action`, `closed_at`, `approved_by`. Inserts to `audit_ledger`.
10. **Inspections:** Fetches `inspections`. Joins `contractors` and `mines`.
11. **NewInspection:** Inserts into `inspections`, inserts primary record into `violations`. Inserts `alerts` for new violation. Handles Supabase Storage uploads to `photos` bucket.
12. **AuditLog:** Fetches `audit_ledger`. Read-only view mapping immutable logs.
13. **Contractors:** Fetches `contractors` and `contractor_incidents`.
14. **ContractorDetail:** Fetches single `contractor` by ID and related `contractor_incidents`.
15. **ManageUsers:** Fetches `users`. Allows corporate to insert new `users` records and map auth ids.
16. **MySubmissions:** Filters `inspections` and `violations` by `inspector_name` matching current user email.
17. **AIWorkbench:** Sends HTTP POST to external AI FastAPI endpoint `/predict` and `/generate_insights` with mine JSON payload.
18. **Profile / Settings:** Reads local profile service. Updates `users` table preferences.
19. **DataImport:** Bulk parses CSV and inserts into `compliance_items`, `violations`, `inspections`.
20. **PitInspector:** A local-first PWA inspection screen. Pushes payloads to `syncService`.

## 5. AI SERVICE - COMPLETE API CONTRACT

- **Host:** Port 8000 (Python FastAPI server).
- **Route `POST /predict`**
  - **Request Body:** `{ mine_id: int, compliance_score: float, violation_count: int, contractor_incidents: int, safety_score: float }`
  - **Internal Logic:** Scales input data using joblib loaded scaler. Predicts default risk score using Random Forest. Uses SHAP TreeExplainer to compute feature contributions (which variables increased/decreased the risk). 
  - **Response Schema:** `{ "prediction": float (risk score 0-100), "explanation": string, "contributing_factors": { "feature": float } }`
- **Route `POST /batch-predict`**: Takes array of above schema.
- **Route `GET /health`**: Returns `{"status": "ok"}`

## 6. OFFLINE SYNC - COMPLETE LOGIC

- **Trigger:** When device is offline (`!navigator.onLine`), `offlineQueue.ts` intercepts network calls (specifically Pit Inspector logs and Violations) and stores payload in `IndexedDB` or `localStorage` under `cg_sync_queue`.
- **Sync Attempt:** A `window.addEventListener('online', syncOfflineQueue)` listener and manual `processSyncQueue` call on App load.
- **Payload Structure:** `{ id: string, endpoint: string, method: string, payload: any, timestamp: string }`.
- **Conflict Resolution:** Last-write wins or append-only. Fails are kept in queue. On success, deleted from queue and fires a `coalguard:syncComplete` CustomEvent.

## 7. ALL BUSINESS LOGIC RULES

- **Risk Scoring:** Handled externally by Python AI service Random Forest model. 
- **Automated Alerts:** 
  - Deadline: Any compliance item with `status = overdue` generates a `high` severity alert.
  - Escalation: Any open violation older than 7 days with no corrective action generates a `critical` severity alert.
- **Audit Hash-Chaining:** In `ViolationDetail.tsx` and `StatutoryRegisters`, an update triggers `computeHash()`. 
  - Logic: Uses Web Crypto API (`SHA-256`) on stringified JSON of the record.
  - Links: Queries `audit_ledger` for `data_hash` of previous record (`prev_hash`). Inserts new audit row with `newHash` and `prevHash`.

## 8. ENVIRONMENT VARIABLES

- `VITE_SUPABASE_URL`: Connects frontend to the Supabase Postgres instance.
- `VITE_SUPABASE_ANON_KEY`: Public API key for frontend Supabase JS client.
- `VITE_AI_SERVICE_URL`: Base URL connecting frontend to Python AI FastAPI backend.
- `AI_MODEL_PATH`: Used in Python backend to load `model.pkl`.

## 9. THIRD-PARTY INTEGRATIONS

- **Supabase:** Used for PostgreSQL Database, Auth, Realtime (WebSockets for alerts channel), and Object Storage (Photos bucket).
- **Vite/React:** Primary UI library and bundler.
- **Lucide-React:** SVG Iconography.
- **Recharts:** Client-side dashboard charting.
- **Leaflet / react-leaflet:** Map tile rendering for Geospatial views.
- **TailwindCSS:** Utility styling system.
- **FastAPI, Scikit-learn, SHAP:** Python AI analytical service stack.
