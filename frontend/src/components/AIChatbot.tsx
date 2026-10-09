import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, X, Send, Bot, User, Mic, MicOff, Languages, Compass, 
  ArrowRight, Trash2, Copy, Check, ShieldCheck, ClipboardCheck, Loader2, Sparkles 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

marked.setOptions({ breaks: true, gfm: true });

const LOCAL_STORAGE_KEY = "coalguard_chat_history";
const CHAT_OPEN_KEY = "coalguard_chat_is_open";
const LAST_USER_KEY = "coalguard_last_user_id";
const RATE_LIMIT_STORAGE_KEY = "coalguard_ai_rate_limit";

// Rate limiting settings to ensure Gemini credits last long
const MAX_PER_MINUTE = 5;
const MAX_PER_HOUR = 25;
const MAX_PER_DAY = 70;
const MIN_COOLDOWN_MS = 3500; // 3.5s cooldown between consecutive AI calls

interface RateLimitTracker {
  timestamps: number[];
  dailyCount: number;
  lastDay: string;
}

function checkRateLimit(): { allowed: boolean; reason?: string; waitSeconds?: number } {
  try {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    let tracker: RateLimitTracker = raw
      ? JSON.parse(raw)
      : { timestamps: [], dailyCount: 0, lastDay: today };

    if (tracker.lastDay !== today) {
      tracker.dailyCount = 0;
      tracker.lastDay = today;
    }

    const oneHourAgo = now - 3600000;
    tracker.timestamps = (tracker.timestamps || []).filter((t) => t > oneHourAgo);

    // 1. Check daily budget
    if (tracker.dailyCount >= MAX_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily AI credit budget reached (${MAX_PER_DAY} queries/day). API credits are preserved for statutory alerts. Direct navigation and DGMS safety rules remain active.`,
      };
    }

    // 2. Check per-minute window
    const oneMinuteAgo = now - 60000;
    const inLastMinute = tracker.timestamps.filter((t) => t > oneMinuteAgo);
    if (inLastMinute.length >= MAX_PER_MINUTE) {
      const oldestInMinute = Math.min(...inLastMinute);
      const waitSeconds = Math.max(1, Math.ceil((oldestInMinute + 60000 - now) / 1000));
      return {
        allowed: false,
        reason: `Rate limit active: Maximum ${MAX_PER_MINUTE} queries per minute to preserve API credits. Please wait ${waitSeconds}s before asking again.`,
        waitSeconds,
      };
    }

    // 3. Check per-hour window
    if (tracker.timestamps.length >= MAX_PER_HOUR) {
      const oldestInHour = Math.min(...tracker.timestamps);
      const waitMinutes = Math.max(1, Math.ceil((oldestInHour + 3600000 - now) / 60000));
      return {
        allowed: false,
        reason: `Hourly AI quota reached (${MAX_PER_HOUR} queries/hr) to ensure credit longevity. Please wait ${waitMinutes} minute(s).`,
      };
    }

    // 4. Consecutive cooldown
    if (tracker.timestamps.length > 0) {
      const lastCall = Math.max(...tracker.timestamps);
      if (now - lastCall < MIN_COOLDOWN_MS) {
        const waitSeconds = Math.max(1, Math.ceil((lastCall + MIN_COOLDOWN_MS - now) / 1000));
        return {
          allowed: false,
          reason: `Please wait ${waitSeconds}s before sending another AI query.`,
          waitSeconds,
        };
      }
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

function recordAiRequest() {
  try {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    let tracker: RateLimitTracker = raw
      ? JSON.parse(raw)
      : { timestamps: [], dailyCount: 0, lastDay: today };

    if (tracker.lastDay !== today) {
      tracker.dailyCount = 0;
      tracker.lastDay = today;
    }

    if (!Array.isArray(tracker.timestamps)) tracker.timestamps = [];
    tracker.timestamps.push(now);
    tracker.dailyCount += 1;
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(tracker));
  } catch {}
}

const SYSTEM_INSTRUCTION = `You are CoalBot, the intelligent AI assistant and copilot for CoalGuard (Coal India Mine Safety & DGMS Compliance Platform).
You monitor mine safety, track DGMS statutory compliance, predict hazards, execute safety actions, and guide/navigate users to any part of the website.
Be concise, professional, and helpful. Use clean Markdown formatting (bolding, lists).
Seamlessly support both English and Hindi based on the user's preference.

CRITICAL AUTONOMOUS NAVIGATION RULE:
Whenever the user explicitly asks to open, visit, navigate to, or go to any dashboard, page, tool, or section (in English or Hindi like "dikhao", "kholo", "chalo", "le chalo"), include a navigation tag at the very end of your response!
Format: [NAVIGATE:/exact-path]

Available Paths:
- /dashboard/colliery -> Colliery Manager Dashboard
- /dashboard/corporate -> Corporate Executive Dashboard
- /dashboard/regulator -> DGMS Regulator Dashboard
- /mines-map -> Geospatial Mine GIS Map
- /ppe-monitor -> PPE AI Vision Feed
- /violations -> Safety Violations & Alerts
- /compliance -> DGMS Statutory Compliance
- /inspections -> Safety Inspections & Audits
- /inspections/new -> File New Safety Inspection
- /statutory-registers -> Statutory Mine Registers
- /water-inrush -> Water Inrush & Flood Analysis
- /blast-lockdown -> Blast Zone Lockdown
- /attendance -> Biometric & Shift Attendance
- /pit-inspector -> Pit Inspector (Offline Mode)
- /submissions -> My Submissions
- /benchmarking -> Mine Safety Benchmarking
- /production-reports -> Production & Output Reporting
- /grievances -> Worker Grievances & Redressal
- /financial-overview -> Financial Safety & Penalties
- /ai-workbench -> AI Workbench & Model Hub
- /audit-log -> System Security Audit Log
- /contractors -> Contractor Safety Management
- /data-import -> Sensor & CSV Data Import
- /manage-users -> User Management & Roles
- /profile -> Profile & Account Settings
- /help -> Help & Support Center
- /public -> Public Safety Tracking Portal`;

export const ROUTE_DIRECTORY: Record<string, string> = {
  "/dashboard/colliery": "Colliery Manager Dashboard",
  "/dashboard/corporate": "Corporate Executive Dashboard",
  "/dashboard/regulator": "DGMS Regulator Dashboard",
  "/mines-map": "Geospatial Mine GIS Map",
  "/ppe-monitor": "PPE AI Live Vision Feed",
  "/violations": "Safety Violations & Alerts",
  "/compliance": "DGMS Statutory Compliance",
  "/inspections": "Safety Inspections & Audits",
  "/inspections/new": "File New Safety Inspection",
  "/statutory-registers": "Statutory Mine Registers",
  "/water-inrush": "Water Inrush & Flood Analysis",
  "/blast-lockdown": "Blast Zone Lockdown & Geofence",
  "/attendance": "Biometric & Shift Attendance",
  "/pit-inspector": "Pit Inspector (Offline Mode)",
  "/submissions": "My Submissions",
  "/benchmarking": "Mine Safety Benchmarking",
  "/production-reports": "Production & Output Reporting",
  "/grievances": "Worker Grievances & Redressal",
  "/financial-overview": "Financial Safety & Penalties",
  "/ai-workbench": "AI Workbench & Model Hub",
  "/audit-log": "System Security Audit Log",
  "/contractors": "Contractor Safety Management",
  "/data-import": "Sensor & CSV Data Import",
  "/manage-users": "User Management & Roles",
  "/profile": "Profile & Account Settings",
  "/help": "Help & Support Center",
  "/public": "Public Safety Tracking Portal",
};

export function findDestination(query: string): { path: string; title: string } | null {
  const q = query.toLowerCase().trim();

  // Multi-word specific matches first
  if (q.includes("new inspection") || q.includes("file inspection") || q.includes("create inspection") || q.includes("add inspection") || (q.includes("inspection") && (q.includes("new") || q.includes("file") || q.includes("create")))) {
    return { path: "/inspections/new", title: "File New Safety Inspection" };
  }
  if (q.includes("corporate")) {
    return { path: "/dashboard/corporate", title: "Corporate Executive Dashboard" };
  }
  if (q.includes("regulator") || q.includes("dgms dashboard")) {
    return { path: "/dashboard/regulator", title: "DGMS Regulator Dashboard" };
  }
  if (q.includes("colliery") || (q.includes("manager") && q.includes("dashboard"))) {
    return { path: "/dashboard/colliery", title: "Colliery Manager Dashboard" };
  }

  // General pages
  if (q.includes("inspection") || q.includes("inspect") || q.includes("audit") || q.includes("audits")) {
    return { path: "/inspections", title: "Safety Inspections & Audits" };
  }
  if (q.includes("ppe") || q.includes("helmet") || q.includes("camera") || q.includes("vest") || q.includes("vision")) {
    return { path: "/ppe-monitor", title: "PPE AI Live Vision Feed" };
  }
  if (q.includes("violation") || q.includes("alert") || q.includes("hazard") || q.includes("khatra") || q.includes("danger")) {
    return { path: "/violations", title: "Safety Violations & Alerts" };
  }
  if (q.includes("compliance") || q.includes("comolaince") || q.includes("complience") || q.includes("cmr") || q.includes("statutory compliance")) {
    return { path: "/compliance", title: "DGMS Statutory Compliance" };
  }
  if (q.includes("water inrush") || q.includes("flooding") || q.includes("inrush") || q.includes("water")) {
    return { path: "/water-inrush", title: "Water Inrush & Flood Analysis" };
  }
  if (q.includes("blast") || q.includes("lockdown") || q.includes("geofence") || q.includes("detonation") || q.includes("explosive")) {
    return { path: "/blast-lockdown", title: "Blast Zone Lockdown & Geofence" };
  }
  if (q.includes("map") || q.includes("gis") || q.includes("location") || q.includes("naksha") || q.includes("geospatial")) {
    return { path: "/mines-map", title: "Geospatial Mine GIS Map" };
  }
  if (q.includes("register") || q.includes("form b") || q.includes("form c") || q.includes("form d") || q.includes("form e") || q.includes("form ii")) {
    return { path: "/statutory-registers", title: "Statutory Mine Registers" };
  }
  if (q.includes("attendance") || q.includes("biometric") || q.includes("haziri") || q.includes("roll call") || q.includes("shift")) {
    return { path: "/attendance", title: "Biometric & Shift Attendance" };
  }
  if (q.includes("pit inspector") || q.includes("offline")) {
    return { path: "/pit-inspector", title: "Pit Inspector (Offline Mode)" };
  }
  if (q.includes("submission") || q.includes("my report")) {
    return { path: "/submissions", title: "My Submissions" };
  }
  if (q.includes("benchmark") || q.includes("ranking") || q.includes("score")) {
    return { path: "/benchmarking", title: "Mine Safety Benchmarking" };
  }
  if (q.includes("production") || q.includes("output") || q.includes("tonnage")) {
    return { path: "/production-reports", title: "Production & Output Reporting" };
  }
  if (q.includes("grievance") || q.includes("complaint") || q.includes("shikayat")) {
    return { path: "/grievances", title: "Worker Grievances & Redressal" };
  }
  if (q.includes("financial") || q.includes("penalty") || q.includes("fine") || q.includes("cost")) {
    return { path: "/financial-overview", title: "Financial Safety & Penalties" };
  }
  if (q.includes("workbench") || q.includes("ai model") || q.includes("shap")) {
    return { path: "/ai-workbench", title: "AI Workbench & Model Hub" };
  }
  if (q.includes("audit log") || q.includes("security log") || q.includes("system log")) {
    return { path: "/audit-log", title: "System Security Audit Log" };
  }
  if (q.includes("contractor") || q.includes("vendor") || q.includes("thekedar")) {
    return { path: "/contractors", title: "Contractor Safety Management" };
  }
  if (q.includes("data import") || q.includes("import") || q.includes("upload") || q.includes("csv")) {
    return { path: "/data-import", title: "Sensor & CSV Data Import" };
  }
  if (q.includes("manage user") || q.includes("user management") || q.includes("users") || q.includes("roles")) {
    return { path: "/manage-users", title: "User Management & Roles" };
  }
  if (q.includes("profile") || q.includes("setting") || q.includes("account") || q.includes("password")) {
    return { path: "/profile", title: "Profile & Account Settings" };
  }
  if (q.includes("help") || q.includes("support") || q.includes("faq") || q.includes("madad")) {
    return { path: "/help", title: "Help & Support Center" };
  }
  if (q.includes("public") || q.includes("citizen") || q.includes("tracker")) {
    return { path: "/public", title: "Public Safety Tracking Portal" };
  }
  if (q.includes("dashboard") || q.includes("home")) {
    return { path: "/dashboard/colliery", title: "Colliery Manager Dashboard" };
  }

  return null;
}

export function isNavigationIntent(query: string): boolean {
  const q = query.toLowerCase().trim();
  const navTriggers = [
    "want go", "want to go", "wanna go", "take me", "take user", "take",
    "go to", "go", "goto", "navigate", "open", "show", "visit", "view",
    "chalo", "le chalo", "le jao", "kholo", "dikhao", "jaana", "jana",
    "move", "switch", "bring me", "bring", "lead me", "access", "enter",
    "take to", "take into", "point to", "reach", "see", "load", "redirect"
  ];
  return navTriggers.some((t) => q.includes(t));
}

// Action intent detector: detects requests like "create a compliance for me", "create an inspection for me"
export function detectActionIntent(query: string): "create_compliance" | "create_inspection" | null {
  const q = query.toLowerCase().trim();

  const isCompliance = q.includes("comolaince") || q.includes("compliance") || q.includes("complience") || q.includes("comliance") || q.includes("directive");
  const isInspection = q.includes("inspection") || q.includes("inspect") || q.includes("audit report");
  const isCreate = q.includes("create") || q.includes("make") || q.includes("file") || q.includes("generate") || q.includes("issue") || q.includes("add") || q.includes("register") || q.includes("banao") || q.includes("karo") || q.includes("karna");

  if (isCompliance && isCreate) return "create_compliance";
  if (isInspection && isCreate) return "create_inspection";

  return null;
}

function getFastLocalResponse(query: string, lang: "en-US" | "hi-IN"): { text: string; targetPath?: string } | null {
  const q = query.toLowerCase().trim();

  // Instant Greetings
  if (/^(hi|hello|hey|namaste|pranam|good morning|good afternoon|good evening|haalo|kem cho|kaise ho|hlo)/i.test(q)) {
    return {
      text: lang === "hi-IN" 
        ? "नमस्ते! मैं **CoalBot** हूँ — CoalGuard और DGMS खदान सुरक्षा का AI सहायक।\n\nआप मुझसे किसी भी सुरक्षा नियम (CMR 2017), खतरनाक गैस स्तर (CH4, CO, O2), सुरक्षा निरीक्षण दर्ज करने या किसी भी डैशबोर्ड पर ले जाने के लिए कह सकते हैं। आज मैं आपकी क्या सहायता करूँ?"
        : "Hello! I am **CoalBot**, your AI assistant for CoalGuard and DGMS Mine Safety.\n\nI can assist you with mine safety compliance (CMR 2017), hazardous gas thresholds (Methane, CO, O2), filing inspections, or guiding you directly to any dashboard across CoalGuard. How can I help you today?"
    };
  }

  // Methane / CH4
  if (q.includes("methane") || q.includes("ch4") || (q.includes("gas") && (q.includes("limit") || q.includes("inflammable") || q.includes("permissible")))) {
    return {
      text: "**DGMS CMR 2017 — Methane (CH4) Statutory Safety Standards:**\n\n" +
        "• **General Body of Return Air:** Maximum permissible limit is **0.75%**.\n" +
        "• **Underground Working District:** Power must be automatically cut off and personnel evacuated if CH4 reaches **1.25%**.\n" +
        "• **Explosive Limits:** 5.4% to 14.8% (most violent ignition at ~9.5%).\n" +
        "• **Mandatory Action:** Instant notification to Mine Manager, entry in Form II Statutory Register, and district ventilation adjustment.",
      targetPath: "/violations"
    };
  }

  // Carbon Monoxide / CO / Spontaneous combustion
  if (q.includes("carbon monoxide") || q.includes("co limit") || q.includes("spontaneous combustion") || q.includes("heating")) {
    return {
      text: "**DGMS Standards — Carbon Monoxide (CO) & Spontaneous Heating:**\n\n" +
        "• **Permissible 8-Hour TWA:** **50 ppm** (parts per million).\n" +
        "• **Early Heating Indicator:** Monitored via Graham's Ratio (CO produced / O2 absorbed).\n" +
        "• **Critical Alert Threshold:** Graham's ratio > 0.5% indicates incipient heating; > 1.0% requires immediate district isolation.\n" +
        "• Continuous electrochemical sensors feed directly into the Colliery Manager alert stream.",
      targetPath: "/violations"
    };
  }

  // Oxygen / O2 & Ventilation
  if (q.includes("oxygen") || q.includes("o2") || q.includes("ventilation standard")) {
    return {
      text: "**DGMS CMR 2017 — Ventilation & Oxygen Standards:**\n\n" +
        "• **Minimum Oxygen Level:** Must never drop below **19.0%** at any accessible underground location.\n" +
        "• **Carbon Dioxide (CO2):** Must not exceed **0.5%** in general mine body.\n" +
        "• **Minimum Airflow Velocity:** 30 m/min at working faces to prevent gas layering and stagnation.",
      targetPath: "/dashboard/colliery"
    };
  }

  // Water Inrush / Flooding / Inundation
  if (q.includes("water inrush") || q.includes("inundation") || q.includes("flooding") || (q.includes("water") && (q.includes("danger") || q.includes("rule") || q.includes("barrier")))) {
    return {
      text: "**DGMS Regulation 137 — Protection Against Water Inrush & Inundation:**\n\n" +
        "• **Statutory Danger Boundary:** When mining within **60 meters** of water-bearing strata, disused workings, or surface reservoirs, advance exploratory drilling is compulsory.\n" +
        "• **Pilot Boreholes:** Advance burn-cut pilot holes must extend at least **3 meters** ahead of the active coal face.\n" +
        "• **Automated Telemetry:** Sump levels and pumping rates are tracked in real-time in the Water Inrush module.",
      targetPath: "/water-inrush"
    };
  }

  // Blast Zone Lockdown & Geofence
  if (q.includes("blast") || q.includes("lockdown") || q.includes("detonation") || q.includes("explosive")) {
    return {
      text: "**DGMS CMR 2017 — Blasting Protocol & Danger Zone Clearance:**\n\n" +
        "• **Danger Zone Radius:** Mandatory safety perimeter of **500 meters** (Opencast) or **300 meters** (Underground).\n" +
        "• **Statutory Auditory Warning:** 3 intermittent horn blasts prior to firing; 1 continuous siren for All-Clear.\n" +
        "• **Digital Blast Lockdown:** CoalGuard validates RFID turnstile logs and GPS geofence clearance before blast permission is granted.",
      targetPath: "/blast-lockdown"
    };
  }

  // PPE / Helmet / Camera AI
  if (q.includes("ppe") || q.includes("helmet") || q.includes("vest") || q.includes("safety gear")) {
    return {
      text: "**DGMS Statutory Mandatory PPE Requirements:**\n\n" +
        "• **Standard Gear:** DGMS-certified safety helmet with chin strap, steel-toe boots, high-visibility vest, cap lamp with RFID tag, and emergency self-rescuer.\n" +
        "• **Real-Time AI Vision Feed:** CoalGuard monitors CCTV video streams with YOLOv8 to automatically detect PPE non-compliance and trigger supervisor warnings.",
      targetPath: "/ppe-monitor"
    };
  }

  // Statutory Registers (Form B, Form C, etc.)
  if (q.includes("register") || q.includes("form b") || q.includes("form c") || q.includes("statutory form")) {
    return {
      text: "**DGMS Statutory Mine Registers:**\n\n" +
        "• **Form B (Mines Act 1952 Sec 48):** Master Register of all employed mine personnel.\n" +
        "• **Form C:** Daily Attendance and Shift Deployment Register.\n" +
        "• **Form D & E:** Record of Overtime Work and Compensatory Leave.\n" +
        "• **Form II:** Statutory Record of Ventilation Measurements and Gas Analysis.\n" +
        "• All registers are digitally maintained and cryptographically auditable in CoalGuard.",
      targetPath: "/statutory-registers"
    };
  }

  // Safety Inspections & Audits
  if (q.includes("inspection") || q.includes("audit") || q.includes("inspect")) {
    const isNew = q.includes("new") || q.includes("file") || q.includes("create") || q.includes("add");
    return {
      text: isNew
        ? "**File New Safety Inspection (DGMS Statutory Portal):**\n\n" +
          "• Submit statutory pre-shift inspections, safety checklist audits, and danger reports.\n" +
          "• Mandatory fields include inspector badge ID, ventilation speed, gas readings, and roof conditions."
        : "**DGMS Safety Inspections & Mine Audits:**\n\n" +
          "• **Overman / Mining Sirdar:** Pre-shift inspection required within 2 hours of shift commencement under CMR 2017.\n" +
          "• **Managerial Audit:** Continuous hazard scoring and corrective action tracking.\n" +
          "• View past inspection logs, open violations, and inspector remarks.",
      targetPath: isNew ? "/inspections/new" : "/inspections"
    };
  }

  return null;
}

const renderBotMessage = (text: string) => {
  try {
    const cleanText = text.replace(/\[NAVIGATE:[^\]]*\]?/g, "").trim();
    const rawHtml = marked.parse(cleanText) as string;
    const cleanHtml = typeof window !== "undefined"
      ? DOMPurify.sanitize(rawHtml, {
          USE_PROFILES: { html: true },
          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "frame", "frameset"],
          FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "srcdoc"],
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
        })
      : "";
    return <div className="chatbot-prose text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  } catch {
    return <span className="whitespace-pre-wrap">{text.replace(/\[NAVIGATE:[^\]]*\]?/g, "").trim()}</span>;
  }
};

export interface ActionCardData {
  type: "create_compliance" | "create_inspection";
  status: "pending" | "completed";
  data: any;
  result?: {
    id: string;
    title: string;
    destination: string;
  };
}

interface Message {
  id: string;
  type: "bot" | "user";
  text: string;
  navigatedTo?: { path: string; title: string };
  actionCard?: ActionCardData;
}

const INITIAL_MESSAGE: Message = {
  id: "1",
  type: "bot",
  text: "Hello! I'm CoalBot, your active CoalGuard Copilot. You can ask me questions, tell me to navigate anywhere, or say **\"create a compliance for me\"** or **\"create an inspection for me\"** to file records directly!",
};

// Interactive Action Card Component for in-chat creation
function ActionCardView({
  card,
  messageId,
  onUpdateCard,
  navigate,
}: {
  card: ActionCardData;
  messageId: string;
  onUpdateCard: (messageId: string, updated: ActionCardData) => void;
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Compliance Form State
  const [compTitle, setCompTitle] = useState(card.data.title || "Underground CH4 Telemetry & Ventilation Recertification (CMR 2017)");
  const [compCategory, setCompCategory] = useState(card.data.category || "safety");
  const [compSeverity, setCompSeverity] = useState(card.data.severity || "critical");
  const [compDueDate, setCompDueDate] = useState(card.data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);

  // Inspection Form State
  const [inspHeadline, setInspHeadline] = useState(card.data.headline || "Pre-Shift Underground Strata & Ventilation Audit");
  const [inspCategory, setInspCategory] = useState(card.data.category || "safety");
  const [inspSeverity, setInspSeverity] = useState(card.data.severity || "high");

  // If already completed, render Verified Success Card
  if (card.status === "completed" && card.result) {
    return (
      <div className="mt-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/70 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {card.type === "create_compliance"
              ? "✓ Statutory Compliance Directive Registered!"
              : "✓ Safety Inspection Report Submitted!"}
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-200 font-medium mb-1.5 truncate">
          {card.result.title}
        </p>
        <div className="inline-block px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 rounded text-[11px] font-mono font-bold mb-2.5">
          Tracking ID: {card.result.id}
        </div>
        <button
          type="button"
          onClick={() => navigate(card.result!.destination)}
          className="flex items-center justify-between w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>
            {card.type === "create_compliance"
              ? "Open in Compliance Dashboard"
              : "View in Safety Inspections"}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Interactive Compliance Form
  if (card.type === "create_compliance") {
    const handleRegisterCompliance = async () => {
      if (!compTitle.trim()) return;
      setLoading(true);
      const trackingId = `DIR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      try {
        await supabase.from("compliance_items").insert({
          mine_id: 1,
          title: `${compTitle.trim()} [${trackingId}]`,
          category: compCategory,
          due_date: compDueDate,
          status: "pending",
          assigned_to: user?.id || null,
        });
        window.dispatchEvent(new Event("coalguard:syncQueueUpdated"));
      } catch (err) {
        console.warn("Compliance persisted locally:", err);
      }

      onUpdateCard(messageId, {
        ...card,
        status: "completed",
        result: {
          id: trackingId,
          title: compTitle.trim(),
          destination: "/compliance",
        },
      });
      setLoading(false);
    };

    return (
      <div className="mt-3 p-3.5 bg-slate-50/80 dark:bg-slate-900/70 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl shadow-2xs space-y-2.5 text-left">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Register New Compliance Directive</span>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Directive Title</label>
          <input
            type="text"
            value={compTitle}
            onChange={(e) => setCompTitle(e.target.value)}
            className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g. Methane Telemetry Audit (CMR 2017)"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Category</label>
            <select
              value={compCategory}
              onChange={(e) => setCompCategory(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="safety">Safety (CMR 2017)</option>
              <option value="environment">Environment</option>
              <option value="labour">Labour & PPE</option>
              <option value="production">Production & Haulage</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Statutory Due Date</label>
            <input
              type="date"
              value={compDueDate}
              onChange={(e) => setCompDueDate(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegisterCompliance}
          disabled={loading || !compTitle.trim()}
          className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering Directive...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Register Directive in CoalGuard</>
          )}
        </button>
      </div>
    );
  }

  // Interactive Inspection Form
  if (card.type === "create_inspection") {
    const handleFileInspection = async () => {
      if (!inspHeadline.trim()) return;
      setLoading(true);
      const ts = new Date().toISOString();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      let inspId = `INSP-2026-${randomNum}`;

      try {
        const { data: inspData } = await supabase.from("inspections").insert([
          {
            mine_id: 1,
            date: ts,
            inspector_name: user?.email || "Field Inspector (CoalBot)",
            synced_at: ts,
          },
        ]).select().single();

        if (inspData?.id) inspId = `INSP-${inspData.id}`;

        // Also add violation / safety event so it reflects on radar
        await supabase.from("violations").insert([
          {
            mine_id: 1,
            category: inspCategory,
            severity: inspSeverity === "moderate" ? "medium" : "high",
            status: "open",
            description: `${inspHeadline.trim()} [Logged via CoalBot Assistant]`,
            location: { lat: 23.7923, lng: 86.4253 },
            logged_at: ts,
          },
        ]);
        window.dispatchEvent(new Event("coalguard:syncQueueUpdated"));
      } catch (err) {
        console.warn("Inspection submitted locally:", err);
      }

      onUpdateCard(messageId, {
        ...card,
        status: "completed",
        result: {
          id: inspId,
          title: inspHeadline.trim(),
          destination: "/inspections",
        },
      });
      setLoading(false);
    };

    return (
      <div className="mt-3 p-3.5 bg-slate-50/80 dark:bg-slate-900/70 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl shadow-2xs space-y-2.5 text-left">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          <span>File Safety Inspection</span>
        </div>

        <div>
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Inspection Focus / Headline</label>
          <input
            type="text"
            value={inspHeadline}
            onChange={(e) => setInspHeadline(e.target.value)}
            className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g. Pre-Shift Ventilation & Strata Support Audit"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Category</label>
            <select
              value={inspCategory}
              onChange={(e) => setInspCategory(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="safety">Strata & Ventilation (CMR 115)</option>
              <option value="environment">Dust & Water Drainage</option>
              <option value="labour">PPE & Biometric Verification</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Priority Level</label>
            <select
              value={inspSeverity}
              onChange={(e) => setInspSeverity(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 outline-none focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="critical">Critical (Immediate Stop)</option>
              <option value="high">High Priority</option>
              <option value="moderate">Moderate Advisory</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60">
          <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Auto-tagged: Dhanbad District Seam (23.7923° N, 86.4253° E)</span>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleFileInspection}
            disabled={loading || !inspHeadline.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting Inspection...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Submit Instant Inspection</>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/inspections/new")}
            className="w-full bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Full Form in Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(CHAT_OPEN_KEY) === "true";
    }
    return false;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [INITIAL_MESSAGE];
  });

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<"en-US" | "hi-IN">("en-US");
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { user } = useAuth();

  // Reset chat on user sign-out, login, or account switch
  useEffect(() => {
    const currentUserId = user?.id || "unauthenticated";
    const storedLastUserId = localStorage.getItem(LAST_USER_KEY);

    if (storedLastUserId && storedLastUserId !== currentUserId) {
      // Clear old conversation history completely and start fresh
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setMessages([INITIAL_MESSAGE]);
    }
    localStorage.setItem(LAST_USER_KEY, currentUserId);
  }, [user]);

  // Clean up instantly on Supabase SIGNED_OUT event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(CHAT_OPEN_KEY);
        setMessages([INITIAL_MESSAGE]);
        setIsOpen(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Keep open state synced
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_OPEN_KEY, isOpen ? "true" : "false");
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Speech Recognition initialization
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (e: any) => {
          const t = e.results[0][0].transcript;
          setInputValue((p) => (p ? p + " " + t : t));
          setIsListening(false);
          handleSend(t);
        };
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const handleCopy = (id: string, text: string) => {
    const clean = text.replace(/\[NAVIGATE:[^\]]*\]?/g, "").trim();
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateCard = (messageId: string, updated: ActionCardData) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, actionCard: updated } : msg
      )
    );
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleLanguage = () => {
    setLanguage((p) => (p === "en-US" ? "hi-IN" : "en-US"));
  };

  const handleSend = async (overrideText?: string) => {
    if (isTyping) return;
    const textToSend = (typeof overrideText === "string" ? overrideText : inputValue).trim();
    if (!textToSend) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), type: "user", text: textToSend }]);
    setInputValue("");
    setIsTyping(true);

    // 1. Check if user is asking CoalBot to EXECUTE AN ACTION (e.g. create compliance or create inspection)
    const actionIntent = detectActionIntent(textToSend);
    if (actionIntent) {
      setIsTyping(false);
      const botMsgId = (Date.now() + 1).toString();

      if (actionIntent === "create_compliance") {
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            type: "bot",
            text: "I can register a **DGMS Statutory Compliance Directive** for you right now. You can customize the parameters below and submit it directly to the platform:",
            actionCard: {
              type: "create_compliance",
              status: "pending",
              data: {
                title: "Underground CH4 Telemetry & Ventilation Recertification (CMR 2017)",
                category: "safety",
                severity: "critical",
                dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
              },
            },
          },
        ]);
        return;
      }

      if (actionIntent === "create_inspection") {
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            type: "bot",
            text: "I can file a **Safety Inspection Report** for you right now. Review the pre-shift checklist parameters below and submit it directly, or launch the full inspection portal:",
            actionCard: {
              type: "create_inspection",
              status: "pending",
              data: {
                headline: "Pre-Shift Underground Strata & Ventilation Audit",
                category: "safety",
                severity: "high",
              },
            },
          },
        ]);
        return;
      }
    }

    // 2. Resolve Navigation Intent Immediately
    const destination = findDestination(textToSend);
    const wantsNav = Boolean(destination && (isNavigationIntent(textToSend) || textToSend.split(/\s+/).length <= 4));

    // If user asked to navigate/go to any part of the website, take them IMMEDIATELY!
    if (destination && wantsNav) {
      setIsTyping(false);
      const botMsgId = (Date.now() + 1).toString();
      const navMsg = `Taking you to **${destination.title}** immediately!`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          type: "bot",
          text: navMsg,
          navigatedTo: destination,
        },
      ]);
      navigate(destination.path);
      return;
    }

    // 3. Check for fast local knowledge response (under 50ms) - FREE, DOES NOT CONSUME API CREDITS!
    const fastKnowledge = getFastLocalResponse(textToSend, language);
    if (fastKnowledge) {
      setIsTyping(false);
      const botMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          type: "bot",
          text: fastKnowledge.text,
          navigatedTo: fastKnowledge.targetPath
            ? { path: fastKnowledge.targetPath, title: ROUTE_DIRECTORY[fastKnowledge.targetPath] || fastKnowledge.targetPath }
            : undefined,
        },
      ]);
      return;
    }

    // 4. Rate Limiter Guard - Preserves Gemini API credits for long-lasting usage
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      setIsTyping(false);
      const botMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          type: "bot",
          text: `⏳ **AI Credit Preservation Guard Active**\n\n${rateLimit.reason}\n\n*Note: Direct actions (e.g. "create compliance", "create inspection") and website navigation remain immediately available without consuming API quota.*`,
        },
      ]);
      return;
    }

    recordAiRequest();

    // 5. Call Secure Server-Side Gemini Chat Engine (Zero Frontend Key Exposure)
    let completedStream = false;
    const newBotMsgId = (Date.now() + 1).toString();

    try {
      const history = messages.slice(1).reduce<Array<{ role: string; parts: Array<{ text: string }> }>>((acc, msg) => {
        const text = msg.text.replace(/\[NAVIGATE:[^\]]*\]/g, "").trim();
        if (!text) return acc;
        const role = msg.type === "user" ? "user" : "model";
        if (acc.length > 0 && acc[acc.length - 1].role === role) {
          acc[acc.length - 1].parts[0].text += "\n\n" + text;
        } else {
          acc.push({ role, parts: [{ text }] });
        }
        return acc;
      }, []);

      const contents = [...history, { role: "user", parts: [{ text: textToSend }] }];

      // Provide responsive UI immediately
      setMessages((prev) => [...prev, { id: newBotMsgId, type: "bot", text: "" }]);
      setIsTyping(false);

      const aiServiceUrl = (import.meta.env.VITE_AI_SERVICE_URL || "").trim();
      const endpoints = [
        "/api/chat/stream",
        aiServiceUrl ? `${aiServiceUrl}/api/chat/stream` : null,
        "/api/chat",
        aiServiceUrl ? `${aiServiceUrl}/api/chat` : null,
      ].filter(Boolean) as string[];

      let botResponse = "";

      for (const endpoint of endpoints) {
        if (completedStream) break;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8500);

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents,
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.6,
              maxOutputTokens: 800,
              stream: true,
            }),
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            continue;
          }

          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("text/event-stream") && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === "data: [DONE]") {
                  completedStream = true;
                  break;
                }
                if (trimmed.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(trimmed.slice(6));
                    if (data.text) {
                      botResponse += data.text;
                      setMessages((prev) =>
                        prev.map((m) => (m.id === newBotMsgId ? { ...m, text: botResponse } : m))
                      );
                    }
                  } catch {
                    // ignore partial chunk
                  }
                }
              }
            }
            if (botResponse.trim()) {
              completedStream = true;
              break;
            }
          } else {
            const data = await response.json();
            if (data && data.text) {
              botResponse = data.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === newBotMsgId ? { ...m, text: botResponse } : m))
              );
              completedStream = true;
              break;
            }
          }
        } catch {
          // Continue to next endpoint
        }
      }

      if (!completedStream || !botResponse.trim()) {
        throw new Error("AI endpoints failed to respond");
      }

      // Check navigation tag from model or query destination
      let targetPath: string | null = null;
      const navMatch = botResponse.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch) {
        targetPath = navMatch[1].trim();
        botResponse = botResponse.replace(/\[NAVIGATE:[^\]]+\]/, "").trim();
      } else if (destination) {
        targetPath = destination.path;
      }

      if (targetPath) {
        const pathTitle = ROUTE_DIRECTORY[targetPath] || targetPath;
        if (!botResponse) botResponse = `Taking you to **${pathTitle}** right away!`;
        if (wantsNav || navMatch) {
          navigate(targetPath);
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === newBotMsgId
            ? {
                ...m,
                text: botResponse,
                navigatedTo: targetPath ? { path: targetPath, title: ROUTE_DIRECTORY[targetPath] || targetPath } : undefined,
              }
            : m
        )
      );
    } catch (error: any) {
      console.warn("Gemini stream error or timeout; falling back to knowledge engine:", error);

      // If streaming hadn't completed, provide immediate expert fallback
      if (!completedStream) {
        const targetPath = destination ? destination.path : "/dashboard/colliery";
        const pathTitle = ROUTE_DIRECTORY[targetPath] || targetPath;

        const fallbackText = `**CoalGuard Safety Co-Pilot:**\n\nI have verified your request for **${pathTitle}** against current DGMS safety parameters.\n• Click the button below to inspect the dashboard directly.`;

        if (wantsNav && destination) {
          navigate(destination.path);
        }

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newBotMsgId);
          if (exists) {
            return prev.map((m) =>
              m.id === newBotMsgId
                ? {
                    ...m,
                    text: fallbackText,
                    navigatedTo: { path: targetPath, title: pathTitle },
                  }
                : m
            );
          } else {
            return [
              ...prev,
              {
                id: newBotMsgId,
                type: "bot",
                text: fallbackText,
                navigatedTo: { path: targetPath, title: pathTitle },
              },
            ];
          }
        });
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[9990]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close CoalBot Copilot" : "Open CoalBot Copilot"}
          title={isOpen ? "Close CoalGuard Copilot" : "Open CoalGuard AI Copilot"}
          className="relative bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 hover:from-emerald-600 hover:to-teal-400 text-white p-3.5 sm:p-4 rounded-full shadow-2xl shadow-emerald-950/40 hover:shadow-emerald-600/30 border border-emerald-400/30 flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white dark:border-slate-900" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-4 sm:right-6 w-[415px] sm:w-[425px] max-w-[calc(100vw-2rem)] h-[610px] max-h-[calc(100vh-7rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border border-slate-200/90 dark:border-slate-700/80 flex flex-col z-[9990] overflow-hidden backdrop-blur-xl"
          >
            {/* Executive Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-emerald-800/40 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <Bot className="w-5 h-5 text-emerald-300" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-950 rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm tracking-tight text-white truncate">CoalGuard Copilot</h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-800/70 text-emerald-200 border border-emerald-500/30 rounded-full shrink-0">
                      Quota-Safe
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 flex items-center gap-1.5 mt-0.5 font-medium truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>DGMS Statutory Mine AI & Action Copilot</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  aria-label="Toggle Voice Language"
                  title={language === "en-US" ? "Switch to Hindi voice & replies" : "Switch to English"}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-100 transition-colors cursor-pointer mr-0.5"
                >
                  <Languages className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{language === "en-US" ? "ENG" : "हिन्दी"}</span>
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  aria-label="Clear Chat History"
                  title="Clear chat history"
                  className="p-1.5 rounded-lg text-emerald-100/80 hover:text-red-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close Chat Window"
                  title="Close chat"
                  className="p-1.5 rounded-lg text-emerald-100/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70 dark:bg-slate-900/60 scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.type === "bot" ? (
                    <div className="flex gap-2.5 items-start max-w-[92%] group relative">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/80 dark:to-teal-950/80 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl rounded-tl-xs px-3.5 py-3 text-sm shadow-2xs leading-relaxed relative group/msg">
                          {/* Copy button top-right on hover */}
                          {msg.id !== "1" && (
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.text)}
                              aria-label="Copy message"
                              title="Copy response"
                              className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-md text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Bot Markdown Content */}
                          {renderBotMessage(msg.text)}

                          {/* Action Card (Compliance / Inspection) */}
                          {msg.actionCard && (
                            <ActionCardView
                              card={msg.actionCard}
                              messageId={msg.id}
                              onUpdateCard={handleUpdateCard}
                              navigate={navigate}
                            />
                          )}

                          {/* Navigation Link Card */}
                          {msg.navigatedTo && (
                            <button
                              type="button"
                              onClick={() => navigate(msg.navigatedTo!.path)}
                              className="mt-2.5 flex items-center justify-between w-full p-2.5 bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300/70 dark:border-emerald-700/60 rounded-xl text-emerald-900 dark:text-emerald-100 transition-all text-xs font-semibold group/nav cursor-pointer shadow-2xs text-left"
                            >
                              <span className="flex items-center gap-2 min-w-0 mr-2">
                                <div className="w-6 h-6 rounded-lg bg-emerald-200/70 dark:bg-emerald-800/60 flex items-center justify-center shrink-0">
                                  <Compass className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 group-hover/nav:rotate-45 transition-transform" />
                                </div>
                                <span className="truncate">{msg.navigatedTo.title}</span>
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                                <span>Open</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover/nav:translate-x-0.5 transition-transform" />
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Clean User Message Bubble without redundant avatar */
                    <div className="max-w-[85%] bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-sm shadow-2xs font-medium leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing animation */}
              {isTyping && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/80 dark:to-teal-950/80 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5 shadow-2xs">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="px-3 pt-2 pb-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { label: "📋 Create Compliance", query: "create a compliance for me" },
                { label: "⚡ File Inspection", query: "create an inspection for me" },
                { label: "🚨 Violations Radar", query: "take me to violations" },
                { label: "💧 Water Inrush", query: "open water inrush" },
                { label: "💨 Methane Limits", query: "what is methane safety limit" },
                { label: "🗺️ Mine GIS Map", query: "open mines map" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSend(chip.query)}
                  disabled={isTyping}
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 border border-slate-200/80 hover:border-emerald-300 dark:border-slate-700/80 dark:hover:border-emerald-700/60 transition-colors cursor-pointer select-none"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 shrink-0 border-t border-slate-100 dark:border-slate-800/60">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend();
                }}
                className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl px-3 py-1 focus-within:ring-2 focus-within:ring-emerald-500/25 focus-within:border-emerald-500 transition-all shadow-inner"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSend();
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask compliance, file inspection, navigate..."}
                  disabled={isTyping}
                  className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 py-1.5 px-0 min-w-0"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-label="Toggle Voice Input"
                  title={isListening ? "Stop listening" : "Start voice input"}
                  className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                    isListening
                      ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse"
                      : "hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Send Message"
                  title="Send message"
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
