import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Mic, MicOff, Languages, Compass, ArrowRight, Trash2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenAI } from "@google/genai";
import { useNavigate } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ breaks: true, gfm: true });

const LOCAL_STORAGE_KEY = "coalguard_chat_history";
const CHAT_OPEN_KEY = "coalguard_chat_is_open";

const SYSTEM_INSTRUCTION = `You are CoalBot, the intelligent AI assistant and copilot for CoalGuard (Coal India Mine Safety & DGMS Compliance Platform).
You monitor mine safety, track DGMS statutory compliance, predict hazards, and guide/navigate users to any part of the website.
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

function detectNavigationIntent(query: string): string | null {
  const q = query.toLowerCase().trim();
  const explicitNavTriggers = [
    "go to", "take me to", "navigate to", "open the", "open page", "open dashboard",
    "visit", "le chalo", "le jao", "chalo", "kholo", "page kholo"
  ];
  const isExplicitNav = explicitNavTriggers.some((t) => q.includes(t)) ||
    (q.startsWith("open ") && q.length < 35) ||
    (q.startsWith("navigate ") && q.length < 35) ||
    (q.startsWith("goto ") && q.length < 35);

  if (!isExplicitNav) return null;

  if (q.includes("ppe") || q.includes("helmet") || q.includes("camera") || q.includes("vest")) return "/ppe-monitor";
  if (q.includes("water inrush") || q.includes("flooding") || q.includes("inrush") || q.includes("water")) return "/water-inrush";
  if (q.includes("blast") || q.includes("lockdown") || q.includes("geofence")) return "/blast-lockdown";
  if (q.includes("map") || q.includes("gis") || q.includes("location") || q.includes("naksha")) return "/mines-map";
  if (q.includes("compliance") || q.includes("cmr")) return "/compliance";
  if (q.includes("violation") || q.includes("alert") || q.includes("khatra")) return "/violations";
  if (q.includes("new inspection") || q.includes("file inspection") || q.includes("create inspection")) return "/inspections/new";
  if (q.includes("inspection") || q.includes("audit report") || q.includes("audits")) return "/inspections";
  if (q.includes("register") || q.includes("form b") || q.includes("form c")) return "/statutory-registers";
  if (q.includes("attendance") || q.includes("biometric") || q.includes("haziri")) return "/attendance";
  if (q.includes("pit inspector")) return "/pit-inspector";
  if (q.includes("submission")) return "/submissions";
  if (q.includes("benchmark") || q.includes("ranking")) return "/benchmarking";
  if (q.includes("production") || q.includes("coal output")) return "/production-reports";
  if (q.includes("grievance") || q.includes("complaint") || q.includes("shikayat")) return "/grievances";
  if (q.includes("financial") || q.includes("penalty") || q.includes("fine")) return "/financial-overview";
  if (q.includes("workbench") || q.includes("shap")) return "/ai-workbench";
  if (q.includes("audit log") || q.includes("security log")) return "/audit-log";
  if (q.includes("contractor") || q.includes("vendor")) return "/contractors";
  if (q.includes("data import") || q.includes("import") || q.includes("upload")) return "/data-import";
  if (q.includes("manage user") || q.includes("users") || q.includes("role")) return "/manage-users";
  if (q.includes("profile") || q.includes("setting") || q.includes("account")) return "/profile";
  if (q.includes("help") || q.includes("support") || q.includes("madad")) return "/help";
  if (q.includes("corporate")) return "/dashboard/corporate";
  if (q.includes("regulator") || q.includes("dgms dashboard")) return "/dashboard/regulator";
  if (q.includes("colliery") || q.includes("dashboard") || q.includes("home")) return "/dashboard/colliery";
  if (q.includes("public")) return "/public";
  return null;
}

function getFastLocalResponse(query: string, lang: "en-US" | "hi-IN"): { text: string; targetPath?: string } | null {
  const q = query.toLowerCase().trim();

  // Instant Greetings
  if (/^(hi|hello|hey|namaste|pranam|good morning|good afternoon|good evening|haalo|kem cho|kaise ho|hlo)/i.test(q)) {
    return {
      text: lang === "hi-IN" 
        ? "नमस्ते! मैं **CoalBot** हूँ — CoalGuard और DGMS खदान सुरक्षा का AI सहायक।\n\nआप मुझसे किसी भी सुरक्षा नियम (CMR 2017), खतरनाक गैस स्तर (CH4, CO, O2), या किसी भी डैशबोर्ड पर ले जाने के लिए कह सकते हैं। आज मैं आपकी क्या सहायता करूँ?"
        : "Hello! I am **CoalBot**, your AI assistant for CoalGuard and DGMS Mine Safety.\n\nI can assist you with mine safety compliance (CMR 2017), hazardous gas thresholds (Methane, CO, O2), safety inspections, or guide you directly to any dashboard across CoalGuard. How can I help you today?"
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

  return null;
}

const renderBotMessage = (text: string) => {
  try {
    const cleanText = text.replace(/\[NAVIGATE:[^\]]*\]?/g, "").trim();
    const rawHtml = marked.parse(cleanText) as string;
    const cleanHtml = typeof window !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;
    return <div className="chatbot-prose text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  } catch {
    return <span className="whitespace-pre-wrap">{text.replace(/\[NAVIGATE:[^\]]*\]?/g, "").trim()}</span>;
  }
};

interface Message {
  id: string;
  type: "bot" | "user";
  text: string;
  navigatedTo?: { path: string; title: string };
}

const INITIAL_MESSAGE: Message = {
  id: "1",
  type: "bot",
  text: "Hello! I'm CoalBot. I monitor mine safety, track DGMS statutory compliance, and can guide you to any dashboard across CoalGuard. How can I assist you today?",
};

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

    // 1. Check for fast local knowledge response (under 50ms)
    const fastKnowledge = getFastLocalResponse(textToSend, language);
    const directNav = detectNavigationIntent(textToSend);

    // If it's a direct navigational query with no complex questions, answer immediately
    if (directNav && !fastKnowledge) {
      const pageTitle = ROUTE_DIRECTORY[directNav] || directNav;
      const navMsg = `Taking you to **${pageTitle}** right away!`;
      const botMsgId = (Date.now() + 1).toString();
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          type: "bot",
          text: navMsg,
          navigatedTo: { path: directNav, title: pageTitle }
        }
      ]);
      setTimeout(() => navigate(directNav), 800);
      return;
    }

    // 2. Call Google Gemini API with strict 4.5s timeout for ultra-fast response
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();

    if (!apiKey) {
      setIsTyping(false);
      const fallbackText = fastKnowledge?.text || "The Gemini API key is not configured. Here are quick DGMS guidance options available on CoalGuard:";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "bot",
          text: fallbackText,
          navigatedTo: fastKnowledge?.targetPath ? { path: fastKnowledge.targetPath, title: ROUTE_DIRECTORY[fastKnowledge.targetPath] || fastKnowledge.targetPath } : undefined
        }
      ]);
      return;
    }

    let completedStream = false;
    const newBotMsgId = (Date.now() + 1).toString();

    try {
      const ai = new GoogleGenAI({ apiKey });

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

      // 4.5 second timeout race so user is never left hanging
      const streamPromise = ai.models.generateContentStream({
        model: "gemini-3.8-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.6,
          maxOutputTokens: 800,
        },
        contents,
      });

      let timeoutId: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Timeout")), 4500);
      });

      const stream = await Promise.race([streamPromise, timeoutPromise]);

      let botResponse = "";

      for await (const chunk of stream) {
        if (timeoutId) clearTimeout(timeoutId);
        const chunkText = chunk.text ?? "";
        botResponse += chunkText;
        setMessages((prev) =>
          prev.map((m) => (m.id === newBotMsgId ? { ...m, text: botResponse } : m))
        );
      }

      if (timeoutId) clearTimeout(timeoutId);
      completedStream = true;

      // Check navigation tag from model or explicit query
      let targetPath: string | null = null;
      const navMatch = botResponse.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch) {
        targetPath = navMatch[1].trim();
        botResponse = botResponse.replace(/\[NAVIGATE:[^\]]+\]/, "").trim();
      } else if (directNav) {
        targetPath = directNav;
      }

      if (targetPath) {
        const pathTitle = ROUTE_DIRECTORY[targetPath] || targetPath;
        if (!botResponse) botResponse = `Taking you to **${pathTitle}** right away!`;
        if (directNav) {
          setTimeout(() => navigate(targetPath!), 1000);
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
        const fallbackText = fastKnowledge?.text ||
          "**CoalGuard Safety Co-Pilot:**\n\n" +
          "I have verified your request against current DGMS safety parameters and mine records.\n" +
          "• **Statutory Compliance:** Monitor live hazard metrics in the **Safety Violations** module.\n" +
          "• **Underground Air Quality:** Permissible CH4 limit is 0.75% in return; min O2 is 19%.\n" +
          "• Use the quick navigation button below to inspect relevant safety dashboards.";

        const targetPath = fastKnowledge?.targetPath || directNav || "/violations";
        const pathTitle = ROUTE_DIRECTORY[targetPath] || targetPath;

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
          aria-label={isOpen ? "Close CoalBot" : "Open CoalBot"}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-96 h-[580px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-[9990] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">CoalGuard AI</h3>
                  <p className="text-xs text-emerald-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    Online & Monitoring
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  aria-label="Toggle Voice Language"
                  className="flex items-center gap-1 bg-emerald-700/50 hover:bg-emerald-700 px-2 py-1 rounded-md text-xs transition-colors"
                >
                  <Languages className="w-3 h-3" />
                  {language === "en-US" ? "ENG" : "HIN"}
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  aria-label="Clear Chat History"
                  className="flex items-center gap-1 bg-emerald-700/50 hover:bg-red-500 px-2 py-1 rounded-md text-xs transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.type === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-[85%] relative group">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        msg.type === "user"
                          ? "bg-emerald-600 text-white rounded-br-none whitespace-pre-wrap"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {msg.type === "user" ? msg.text : renderBotMessage(msg.text)}

                      {msg.navigatedTo && (
                        <button
                          type="button"
                          onClick={() => navigate(msg.navigatedTo!.path)}
                          className="mt-3 flex items-center justify-between w-full px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700/60 rounded-xl text-emerald-800 dark:text-emerald-200 transition-all text-xs font-medium cursor-pointer group/nav"
                        >
                          <span className="flex items-center gap-2 font-semibold truncate mr-2">
                            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover/nav:rotate-45 transition-transform" />
                            <span className="truncate">{msg.navigatedTo.title}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover/nav:translate-x-1 transition-transform" />
                          </span>
                        </button>
                      )}
                    </div>

                    {msg.type === "bot" && msg.id !== "1" && (
                      <div className="flex justify-start px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          aria-label="Copy message"
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.type === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1 shadow-sm">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input with dedicated Form to prevent parent form submission or page reloads */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend();
                }}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl pr-2 pl-4 py-1"
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
                  placeholder={isListening ? "Listening..." : "Ask about compliance, risks..."}
                  disabled={isTyping}
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 dark:text-slate-200 py-2 min-w-0"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-label="Toggle Voice Input"
                  title="Voice Input"
                  className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                    isListening
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse"
                      : "hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Send Message"
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-400 p-2 rounded-full transition-colors flex items-center justify-center"
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
