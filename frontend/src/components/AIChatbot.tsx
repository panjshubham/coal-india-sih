import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Mic, MicOff, Languages, Compass, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true
});

const renderBotMessage = (text: string) => {
  try {
    // Hide navigation tags if they appear during streaming
    const cleanText = text.replace(/\[NAVIGATE:[^\]]*\]?/g, '').trim();
    const rawHtml = marked.parse(cleanText) as string;
    const cleanHtml = typeof window !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
    return (
      <div 
        className="chatbot-prose text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  } catch {
    return <span className="whitespace-pre-wrap">{text.replace(/\[NAVIGATE:[^\]]*\]?/g, '').trim()}</span>;
  }
};

export const ROUTE_DIRECTORY: Record<string, string> = {
  '/dashboard/colliery': 'Colliery Manager Dashboard',
  '/dashboard/corporate': 'Corporate Executive Dashboard',
  '/dashboard/regulator': 'DGMS Regulator Dashboard',
  '/mines-map': 'Geospatial Mine GIS Map',
  '/ppe-monitor': 'PPE AI Live Vision Feed',
  '/violations': 'Safety Violations & Alerts',
  '/compliance': 'DGMS Statutory Compliance',
  '/inspections': 'Safety Inspections & Audits',
  '/inspections/new': 'File New Safety Inspection',
  '/statutory-registers': 'Statutory Mine Registers (Form B/C)',
  '/water-inrush': 'Water Inrush & Flood Analysis',
  '/blast-lockdown': 'Blast Zone Lockdown & Geofence',
  '/attendance': 'Biometric & Shift Attendance',
  '/pit-inspector': 'Pit Inspector (Offline Mode)',
  '/submissions': 'My Submissions',
  '/benchmarking': 'Mine Safety Benchmarking',
  '/production-reports': 'Production & Output Reporting',
  '/grievances': 'Worker Grievances & Redressal',
  '/financial-overview': 'Financial Safety & Penalties',
  '/ai-workbench': 'AI Workbench & Model Hub',
  '/audit-log': 'System Security Audit Log',
  '/contractors': 'Contractor Safety Management',
  '/data-import': 'Sensor & CSV Data Import',
  '/manage-users': 'User Management & Roles',
  '/profile': 'Profile & Account Settings',
  '/help': 'Help & Support Center',
  '/public': 'Public Safety Tracking Portal'
};

function detectNavigationIntent(query: string): string | null {
  const q = query.toLowerCase().trim();
  const navTriggers = ['go to', 'open', 'take me', 'navigate', 'show me', 'show', 'view', 'kholo', 'dikhao', 'chalo', 'le chalo', 'le jao', 'visit'];
  const hasTrigger = navTriggers.some(t => q.includes(t));
  if (!hasTrigger) return null;

  if (q.includes('ppe') || q.includes('helmet') || q.includes('camera') || q.includes('live feed') || q.includes('vest')) return '/ppe-monitor';
  if (q.includes('water inrush') || q.includes('flooding') || q.includes('inrush') || q.includes('leakage') || q.includes('water')) return '/water-inrush';
  if (q.includes('blast') || q.includes('lockdown') || q.includes('geofence')) return '/blast-lockdown';
  if (q.includes('map') || q.includes('gis') || q.includes('location') || q.includes('naksha')) return '/mines-map';
  if (q.includes('compliance') || q.includes('cmr') || q.includes('statutory compliance')) return '/compliance';
  if (q.includes('violation') || q.includes('alert') || q.includes('danger') || q.includes('khatra')) return '/violations';
  if (q.includes('new inspection') || q.includes('file inspection') || q.includes('create inspection')) return '/inspections/new';
  if (q.includes('inspection') || q.includes('audit report')) return '/inspections';
  if (q.includes('register') || q.includes('form b') || q.includes('form c') || q.includes('statutory register')) return '/statutory-registers';
  if (q.includes('attendance') || q.includes('biometric') || q.includes('haziri') || q.includes('muster')) return '/attendance';
  if (q.includes('pit inspector') || q.includes('pit inspection')) return '/pit-inspector';
  if (q.includes('submission')) return '/submissions';
  if (q.includes('benchmark') || q.includes('ranking') || q.includes('comparison')) return '/benchmarking';
  if (q.includes('production') || q.includes('coal output') || q.includes('extraction')) return '/production-reports';
  if (q.includes('grievance') || q.includes('complaint') || q.includes('shikayat')) return '/grievances';
  if (q.includes('financial') || q.includes('penalty') || q.includes('cost') || q.includes('fine')) return '/financial-overview';
  if (q.includes('ai workbench') || q.includes('model') || q.includes('workbench') || q.includes('shap')) return '/ai-workbench';
  if (q.includes('audit log') || q.includes('security log') || q.includes('activity log')) return '/audit-log';
  if (q.includes('contractor') || q.includes('vendor')) return '/contractors';
  if (q.includes('data import') || q.includes('import') || q.includes('upload')) return '/data-import';
  if (q.includes('manage user') || q.includes('users') || q.includes('role') || q.includes('permission')) return '/manage-users';
  if (q.includes('profile') || q.includes('setting') || q.includes('account')) return '/profile';
  if (q.includes('help') || q.includes('support') || q.includes('guide') || q.includes('madad')) return '/help';
  if (q.includes('corporate')) return '/dashboard/corporate';
  if (q.includes('regulator') || q.includes('dgms dashboard')) return '/dashboard/regulator';
  if (q.includes('dashboard') || q.includes('colliery') || q.includes('home')) return '/dashboard/colliery';
  if (q.includes('public')) return '/public';

  return null;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  navigatedTo?: {
    path: string;
    title: string;
  };
}

const INITIAL_MESSAGE: Message = {
  id: '1',
  type: 'bot',
  text: "Hello! I'm CoalBot. I monitor mine safety, track DGMS compliance, and can take you directly to any dashboard across CoalGuard. How can I assist you today?"
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'hi-IN'>('en-US');
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => prev ? prev + ' ' + transcript : transcript);
          setIsListening(false);
          // Automatically send the voice command
          handleSend(transcript);
        };
        
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Try Chrome.");
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
    setLanguage(prev => prev === 'en-US' ? 'hi-IN' : 'en-US');
  };

  const handleSend = async (overrideText?: string) => {
    if (isTyping) return;
    const textToSend = typeof overrideText === 'string' ? overrideText : inputValue;
    if (!textToSend.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: "Configuration Notice: The Gemini API key (VITE_GEMINI_API_KEY) is not set. Please configure VITE_GEMINI_API_KEY in your environment and redeploy."
      }]);
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        systemInstruction: `You are CoalBot, the intelligent AI assistant and copilot for CoalGuard (Coal India Mine Safety & DGMS Compliance Platform).
        You monitor mine safety, track DGMS statutory compliance, predict hazards, and guide/navigate users to any part of the website.
        Be concise, professional, and helpful. Use clean Markdown formatting (bolding, lists).
        Seamlessly support both English and Hindi based on the user's preference.

        CRITICAL AUTONOMOUS NAVIGATION RULE:
        Whenever the user asks to open, view, show, visit, or navigate to any dashboard, page, tool, or section (in English or Hindi like "dikhao", "kholo", "chalo", "le chalo"), or when their request is best answered by viewing a specific dashboard, you MUST include a navigation tag at the very end of your response!
        Format: [NAVIGATE:/exact-path]

        Complete Directory of Available Paths & Dashboards:
        - /dashboard/colliery -> Colliery Manager Dashboard (pit operations, sensor alerts, gas levels, active shift, production)
        - /dashboard/corporate -> Corporate Executive Dashboard (enterprise KPI, multi-mine safety index, executive overview)
        - /dashboard/regulator -> DGMS Regulator Dashboard (statutory audits, legal notices, mine safety compliance rating)
        - /mines-map -> 3D Geospatial Mine GIS Map (mine locations, satellite overlays, hazard zones)
        - /ppe-monitor -> PPE AI Vision Feed (computer vision camera feed, helmet & safety vest detection)
        - /violations -> Active Safety Violations & Live Alerts (unresolved hazards, live alarms)
        - /compliance -> DGMS Statutory Compliance (CMR 2017 checklist, statutory readiness)
        - /inspections -> Safety Inspections & Audits (routine & surprise audit logs)
        - /inspections/new -> File / Create New Safety Inspection
        - /statutory-registers -> Statutory Mine Registers (Form A, B, C, D, E, H registers)
        - /water-inrush -> Water Inrush & Hydrogeological Analysis (CLSSA-XGBoost flooding model, seam proximity)
        - /blast-lockdown -> Blast Zone Lockdown & Geofence (active blasting alerts, clearance protocol)
        - /attendance -> Biometric & Shift Attendance (worker check-ins, muster roll, cap lamp logs)
        - /pit-inspector -> Pit Inspector Tool (field inspection offline logger)
        - /submissions -> My Submissions (filed inspection logs)
        - /benchmarking -> Mine Safety Benchmarking (comparative safety ranking between mines)
        - /production-reports -> Daily Production & Coal Extraction Reports
        - /grievances -> Worker Grievance Redressal (safety complaints, labor hazards)
        - /financial-overview -> Financial Safety Dashboard (penalties, insurance savings, ROI)
        - /ai-workbench -> AI Workbench & Model Hub (ML model playground, TreeSHAP explainability)
        - /audit-log -> System Security Audit Log (immutable user activity logs)
        - /contractors -> Contractor Safety Management (vendor compliance & labor safety)
        - /data-import -> Sensor & CSV Data Import (bulk telemetry upload)
        - /manage-users -> User Management & Access Roles
        - /profile -> User Profile & Account Settings
        - /help -> Help & Support Center
        - /public -> Public Safety Tracking Portal

        Example responses:
        - User: "take me to ppe feed" -> Response: "Opening the AI Computer Vision PPE monitor for live helmet and vest detection. [NAVIGATE:/ppe-monitor]"
        - User: "water inrush dikhao" -> Response: "Navigating to the Water Inrush & Hydrogeological Analysis dashboard. [NAVIGATE:/water-inrush]"
        - User: "open map" -> Response: "Taking you to the Geospatial Mine Map right away. [NAVIGATE:/mines-map]"
        - User: "check compliance" -> Response: "Here is the DGMS statutory compliance checklist. [NAVIGATE:/compliance]"
        - User: "show attendance" -> Response: "Opening Biometric Attendance and Shift Rosters. [NAVIGATE:/attendance]"`,
      });

      // Ensure valid history: no empty messages, and strictly alternating roles to prevent 400 Bad Request
      const validHistory: any[] = [];
      let lastRole = '';
      
      messages.slice(1).forEach(msg => {
        const text = msg.text.trim();
        if (!text) return;
        const role = msg.type === 'user' ? 'user' : 'model';
        if (role === lastRole) {
          validHistory[validHistory.length - 1].parts[0].text += '\n\n' + text;
        } else {
          validHistory.push({ role, parts: [{ text }] });
          lastRole = role;
        }
      });

      const chat = model.startChat({
        history: validHistory,
      });

      const result = await chat.sendMessageStream(textToSend);
      
      const newBotMsgId = (Date.now() + 1).toString();
      let botResponse = '';
      
      // Add empty bot message and turn off typing indicator
      setMessages(prev => [...prev, {
        id: newBotMsgId,
        type: 'bot',
        text: ''
      }]);
      setIsTyping(false);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        botResponse += chunkText;
        
        // Update message in state
        setMessages(prev => prev.map(msg => 
          msg.id === newBotMsgId ? { ...msg, text: botResponse } : msg
        ));
      }

      // Check for navigation command from model or client intent fallback
      let targetPath: string | null = null;
      const navMatch = botResponse.match(/\[NAVIGATE:([^\]]+)\]/);
      if (navMatch) {
        targetPath = navMatch[1].trim();
        botResponse = botResponse.replace(/\[NAVIGATE:[^\]]+\]/, '').trim();
      } else {
        targetPath = detectNavigationIntent(textToSend);
      }

      if (targetPath) {
        const pageTitle = ROUTE_DIRECTORY[targetPath] || targetPath;
        if (!botResponse) {
          botResponse = `Taking you to **${pageTitle}** right away!`;
        }

        // Automatically navigate after 1.2 seconds so user sees confirmation
        setTimeout(() => {
          navigate(targetPath!);
        }, 1200);
      }

      // Final update to the message to set navigatedTo
      setMessages(prev => prev.map(msg => 
        msg.id === newBotMsgId ? {
          ...msg,
          text: botResponse,
          navigatedTo: targetPath ? {
            path: targetPath,
            title: ROUTE_DIRECTORY[targetPath] || targetPath
          } : undefined
        } : msg
      ));
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      const errorMsg = error?.message || String(error);
      const isAuthError = 
        errorMsg.includes('401') || 
        errorMsg.includes('403') || 
        errorMsg.includes('API key') || 
        errorMsg.includes('credentials') || 
        errorMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED');

      let replyText = `I'm sorry, I encountered an error connecting to my systems. (Error: ${errorMsg}). Please try again.`;
      if (isAuthError) {
        replyText = "Authentication Error: Google rejected the API key (401/403). Please verify that your active Google AI Studio API key is entered in Vercel under VITE_GEMINI_API_KEY and redeploy.";
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: replyText
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9990]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-96 h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-[9990] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">CoalGuard AI</h3>
                  <p className="text-xs text-emerald-100 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    Online & Monitoring
                  </p>
                </div>
              </div>
              
              {/* Language Toggle */}
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 bg-emerald-700/50 hover:bg-emerald-700 px-2 py-1 rounded-md text-xs transition-colors"
                title="Toggle Voice Language"
              >
                <Languages className="w-3 h-3" />
                {language === 'en-US' ? 'ENG' : 'HIN'}
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.type === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.type === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none whitespace-pre-wrap'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.type === 'user' ? msg.text : renderBotMessage(msg.text)}

                    {msg.navigatedTo && (
                      <button
                        type="button"
                        onClick={() => navigate(msg.navigatedTo!.path)}
                        className="mt-3 flex items-center justify-between w-full px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700/60 rounded-xl text-emerald-800 dark:text-emerald-200 transition-all text-xs font-medium cursor-pointer shadow-xs group"
                      >
                        <span className="flex items-center gap-2 font-semibold truncate mr-2">
                          <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:rotate-45 transition-transform" />
                          <span className="truncate">{msg.navigatedTo.title}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold shrink-0">
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    )}
                  </div>

                  {msg.type === 'user' && (
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
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl pr-2 pl-4 py-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? "Listening..." : "Ask about compliance, risks..."}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-700 dark:text-slate-200 py-2 min-w-0"
                  />
                  
                  {/* Voice Button */}
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                      isListening 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                    title="Voice Input"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send Button */}
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
