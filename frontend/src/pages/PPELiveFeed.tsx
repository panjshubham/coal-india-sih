import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera, ShieldAlert, ShieldCheck, HardHat, Shirt,
  AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw,
  Eye, Clock, MapPin, Zap, Activity, TrendingUp, TrendingDown,
  Minus, Radio, X, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useTheme } from '../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PPEEvent {
  id: string;
  camera_id: string;
  zone: string;
  detected_at: string;
  person_count: number;
  violation_count: number;
  missing_ppe: string[];
  ppe_detected: string[];
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_resolved: boolean;
  snapshot_base64?: string;
}

interface ZoneStat {
  zone: string;
  total_persons_scanned: number;
  total_violations: number;
  compliance_pct: number;
  unresolved_count: number;
  critical_count: number;
  last_scan_at: string;
}

interface Camera {
  camera_id: string;
  zone: string;
  location: string;
  is_active: boolean;
}

interface DashboardSummary {
  overall_compliance_pct: number;
  total_persons_scanned_today: number;
  total_violations_today: number;
  active_violations: number;
  critical_violations: number;
  high_violations: number;
  trend: 'improving' | 'worsening' | 'stable';
  zone_breakdown: ZoneStat[];
  recent_events: PPEEvent[];
}

// ── Demo data fallback ────────────────────────────────────────────────────────
const DEMO_SUMMARY: DashboardSummary = {
  overall_compliance_pct: 91.4,
  total_persons_scanned_today: 382,
  total_violations_today: 32,
  active_violations: 10,
  critical_violations: 3,
  high_violations: 4,
  trend: 'improving',
  zone_breakdown: [
    { zone: 'Pit-1',     total_persons_scanned: 142, total_violations: 12, compliance_pct: 91.5, unresolved_count: 3, critical_count: 1, last_scan_at: new Date().toISOString() },
    { zone: 'Haul Road', total_persons_scanned: 87,  total_violations: 4,  compliance_pct: 95.4, unresolved_count: 1, critical_count: 0, last_scan_at: new Date().toISOString() },
    { zone: 'Shaft-3',   total_persons_scanned: 54,  total_violations: 8,  compliance_pct: 85.2, unresolved_count: 4, critical_count: 2, last_scan_at: new Date().toISOString() },
    { zone: 'Washery',   total_persons_scanned: 38,  total_violations: 2,  compliance_pct: 94.7, unresolved_count: 0, critical_count: 0, last_scan_at: new Date().toISOString() },
    { zone: 'Pit-2',     total_persons_scanned: 61,  total_violations: 6,  compliance_pct: 90.2, unresolved_count: 2, critical_count: 1, last_scan_at: new Date().toISOString() },
  ],
  recent_events: generateDemoEvents(),
};

function generateDemoEvents(): PPEEvent[] {
  const zones   = ['Pit-1', 'Haul Road', 'Shaft-3', 'Washery', 'Pit-2'];
  const cameras = ['CAM-PIT1-01', 'CAM-HAUL-01', 'CAM-SHFT-01', 'CAM-WASH-01', 'CAM-PIT2-01'];
  const scenarios = [
    { missing: ['helmet'], detected: ['safety_vest'], severity: 'critical' as const, v: 1 },
    { missing: ['safety_vest'], detected: ['helmet'], severity: 'medium' as const, v: 1 },
    { missing: ['helmet', 'safety_vest'], detected: [], severity: 'critical' as const, v: 2 },
    { missing: [], detected: ['helmet', 'safety_vest'], severity: 'low' as const, v: 0 },
    { missing: [], detected: ['helmet', 'safety_vest'], severity: 'low' as const, v: 0 },
    { missing: ['helmet'], detected: ['safety_vest'], severity: 'high' as const, v: 2 },
  ];
  return Array.from({ length: 20 }, (_, i) => {
    const s = scenarios[i % scenarios.length];
    return {
      id: `demo-${i}`,
      camera_id: cameras[i % cameras.length],
      zone: zones[i % zones.length],
      detected_at: new Date(Date.now() - i * 3 * 60 * 1000).toISOString(),
      person_count: Math.floor(Math.random() * 5) + 1,
      violation_count: s.v,
      missing_ppe: s.missing,
      ppe_detected: s.detected,
      confidence: +(0.82 + Math.random() * 0.15).toFixed(3),
      severity: s.severity,
      is_resolved: i > 8,
    };
  });
}

const DEMO_CAMERAS: Camera[] = [
  { camera_id: 'CAM-PIT1-01', zone: 'Pit-1',     location: 'Main excavation entry',  is_active: true },
  { camera_id: 'CAM-PIT1-02', zone: 'Pit-1',     location: 'Blast zone perimeter',   is_active: true },
  { camera_id: 'CAM-HAUL-01', zone: 'Haul Road', location: 'Weighbridge approach',   is_active: true },
  { camera_id: 'CAM-SHFT-01', zone: 'Shaft-3',   location: 'Cage loading platform',  is_active: true },
  { camera_id: 'CAM-WASH-01', zone: 'Washery',   location: 'Conveyor belt junction', is_active: false },
  { camera_id: 'CAM-PIT2-01', zone: 'Pit-2',     location: 'Southern bench entry',   is_active: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const AI_BASE  = 'http://127.0.0.1:8000';
const MINE_ID  = '1'; // Replace with actual mine ID from auth context

// High-contrast, sober official government badges
const SEVERITY_CFG = {
  critical: {
    bg: 'bg-red-50/90 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800/60',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 border-red-300 dark:border-red-700',
    dot: 'bg-red-600 dark:bg-red-500',
    label: 'CRITICAL',
  },
  high: {
    bg: 'bg-orange-50/90 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800/60',
    text: 'text-orange-800 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200 border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-600 dark:bg-orange-500',
    label: 'HIGH',
  },
  medium: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-800 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    dot: 'bg-amber-600 dark:bg-amber-400',
    label: 'MEDIUM',
  },
  low: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    text: 'text-emerald-800 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-600 dark:bg-emerald-500',
    label: 'CLEAR',
  },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

function ComplianceRing({ pct, isDark }: { pct: number; isDark: boolean }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 90 ? (isDark ? '#34d399' : '#059669') : pct >= 75 ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#f87171' : '#dc2626');
  const trackColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <svg width="88" height="88" className="rotate-[-90deg]">
      <circle cx="44" cy="44" r={r} fill="none" stroke={trackColor} strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="14" fontWeight="bold" className="rotate-90" style={{ transform: 'rotate(90deg)', transformOrigin: '44px 44px' }}>
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

// ── Camera Card ───────────────────────────────────────────────────────────────
function CameraCard({ cam, latestEvent }: { cam: Camera; latestEvent?: PPEEvent }) {
  const cfg = latestEvent?.severity ? SEVERITY_CFG[latestEvent.severity] : SEVERITY_CFG.low;
  return (
    <div className={`rounded-xl border p-3.5 transition-all ${
      cam.is_active 
        ? `${cfg.bg} ${cfg.border} shadow-xs` 
        : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 opacity-60'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cam.is_active ? (latestEvent?.violation_count ? cfg.dot + ' animate-pulse' : 'bg-emerald-600') : 'bg-slate-400'}`} />
          <span className="text-xs font-bold text-slate-900 dark:text-white">{cam.camera_id}</span>
        </div>
        <Camera className={`w-4 h-4 ${cam.is_active ? 'text-slate-800 dark:text-slate-500' : 'text-slate-800 dark:text-slate-400'}`} />
      </div>
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{cam.zone}</p>
      <p className="text-xs text-slate-800 dark:text-slate-500 truncate">{cam.location}</p>
      {latestEvent && cam.is_active && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/40">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
            <span className="text-[11px] text-slate-800 dark:text-slate-500">{timeAgo(latestEvent.detected_at)}</span>
          </div>
          {latestEvent.missing_ppe.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {latestEvent.missing_ppe.map(p => (
                <span key={p} className="text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                  {p === 'helmet' ? '⛑️ No Helmet' : '🦺 No Vest'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {!cam.is_active && <p className="text-xs text-slate-800 dark:text-slate-500 mt-1 font-medium">Offline</p>}
    </div>
  );
}

// ── Event Row ─────────────────────────────────────────────────────────────────
function EventRow({ event, onResolve }: { event: PPEEvent; onResolve: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CFG[event.severity];
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      event.is_resolved 
        ? 'opacity-70 border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30' 
        : `${cfg.bg} ${cfg.border} shadow-xs`
    }`}>
      <div className="p-3.5 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${event.is_resolved ? 'bg-slate-400' : cfg.dot + (event.severity === 'critical' ? ' animate-pulse' : '')}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-white">{event.camera_id}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{event.zone}</span>
            {event.missing_ppe.length > 0 && (
              <div className="flex gap-1">
                {event.missing_ppe.map(p => (
                  <span key={p} className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                    {p === 'helmet' ? '⛑️ Missing Helmet' : '🦺 Missing Vest'}
                  </span>
                ))}
              </div>
            )}
            {event.missing_ppe.length === 0 && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">✅ Compliant</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-800 dark:text-slate-500">
            <span>{timeAgo(event.detected_at)}</span>
            <span>·</span>
            <span>{event.person_count} person{event.person_count !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{(event.confidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-700 dark:text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-700 dark:text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700/40 pt-3 space-y-3 bg-white/50 dark:bg-slate-900/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Persons Detected', value: event.person_count },
              { label: 'Violations', value: event.violation_count },
              { label: 'AI Confidence', value: `${(event.confidence * 100).toFixed(1)}%` },
              { label: 'Vision Model', value: 'PPE-Heuristic-v4.0' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/40 rounded-lg p-2.5">
                <p className="text-[11px] font-medium text-slate-800 dark:text-slate-500">{label}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-500 mb-1">Equipment Compliance</p>
              <div className="flex gap-2">
                {['helmet', 'safety_vest'].map(item => (
                  <span key={item} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded border font-medium ${
                    event.missing_ppe.includes(item)
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  }`}>
                    {event.missing_ppe.includes(item) ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {item === 'helmet' ? 'Safety Helmet' : 'Reflective Vest'}
                  </span>
                ))}
              </div>
            </div>
            {!event.is_resolved && event.violation_count > 0 && (
              <button
                onClick={() => onResolve(event.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-slate-900 dark:text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
              </button>
            )}
            {event.is_resolved && (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PPELiveFeed() {
  const { theme }                     = useTheme();
  const isDark                        = theme === 'dark';
  const [summary, setSummary]         = useState<DashboardSummary>(DEMO_SUMMARY);
  const [cameras, setCameras]         = useState<Camera[]>(DEMO_CAMERAS);
  const [events, setEvents]           = useState<PPEEvent[]>(DEMO_SUMMARY.recent_events);
  const [loading, setLoading]         = useState(false);
  const [backendUp, setBackendUp]     = useState<boolean | null>(null);
  const [liveMode, setLiveMode]       = useState(false);
  const [pollInterval, setPollInterval] = useState<number>(10000);
  const [filterZone, setFilterZone]   = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'critical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumResp, camResp] = await Promise.all([
        fetch(`${AI_BASE}/api/ppe/dashboard-summary/${MINE_ID}`, { signal: AbortSignal.timeout(8000) }),
        fetch(`${AI_BASE}/api/ppe/cameras/${MINE_ID}`, { signal: AbortSignal.timeout(8000) }),
      ]);
      if (sumResp.ok) {
        const sum = await sumResp.json();
        setSummary(sum);
        setEvents(sum.recent_events || []);
        setBackendUp(true);
      }
      if (camResp.ok) {
        const cam = await camResp.json();
        setCameras(cam.cameras || []);
      }
    } catch {
      setBackendUp(false);
      setSummary(DEMO_SUMMARY);
      setEvents(DEMO_SUMMARY.recent_events);
      setCameras(DEMO_CAMERAS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Scalable Live polling mode with tab visibility throttling (pauses when browser tab is inactive)
  useEffect(() => {
    if (!liveMode) {
      if (liveRef.current) clearInterval(liveRef.current);
      return;
    }

    const startPolling = () => {
      if (liveRef.current) clearInterval(liveRef.current);
      liveRef.current = setInterval(fetchAll, pollInterval);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (liveRef.current) clearInterval(liveRef.current);
      } else {
        fetchAll();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (liveRef.current) clearInterval(liveRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [liveMode, pollInterval, fetchAll]);

  function handleResolve(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, is_resolved: true } : e));
    fetch(`${AI_BASE}/api/ppe/resolve/${id}`, { method: 'PATCH' }).catch(() => {});
  }

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filterZone !== 'all' && e.zone.toLowerCase() !== filterZone.toLowerCase()) return false;
    if (filterStatus === 'unresolved' && e.is_resolved) return false;
    if (filterStatus === 'critical' && e.severity !== 'critical') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = e.camera_id.toLowerCase().includes(q) || e.zone.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const zones = [...new Set(events.map(e => e.zone))];

  // Map camera to its latest event
  const latestByCamera: Record<string, PPEEvent> = {};
  events.forEach(e => { if (!latestByCamera[e.camera_id]) latestByCamera[e.camera_id] = e; });

  const compPct = summary.overall_compliance_pct;
  const trendIcon = summary.trend === 'improving' ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> :
                    summary.trend === 'worsening' ? <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" /> :
                    <Minus className="w-4 h-4 text-slate-600 dark:text-slate-400" />;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 pb-24">

      {/* Header — Official Government Portal Standard */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">
            <span>Ministry of Coal</span> <span>/</span>
            <span>Coal India Limited</span> <span>/</span>
            <span className="text-amber-700 dark:text-amber-400 font-bold">DGMS Statutory Safety</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-amber-600 dark:text-amber-500 shrink-0" />
            PPE Live Safety Monitor
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">PPE Heuristic Engine v4</span>
            <span>·</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{cameras.filter(c => c.is_active).length} of {cameras.length} CCTV Feeds Active</span>
            <span>·</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Real-Time DGMS Rule 29 Enforcement</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            backendUp 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${backendUp ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
            {backendUp === null ? 'Connecting...' : backendUp ? 'AI Service Connected' : 'Simulated Feed'}
          </div>
          
          {/* Rate Selector */}
          <select
            value={pollInterval}
            onChange={e => setPollInterval(Number(e.target.value))}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 font-medium shadow-xs"
            title="Scan refresh interval"
          >
            <option value={5000}>5s poll</option>
            <option value={10000}>10s poll</option>
            <option value={30000}>30s poll</option>
          </select>

          <button
            onClick={() => setLiveMode(!liveMode)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
              liveMode 
                ? 'bg-red-700 text-slate-900 dark:text-white animate-pulse' 
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {liveMode ? 'STREAMING LIVE' : 'START LIVE'}
          </button>
          <button 
            onClick={fetchAll} 
            disabled={loading}
            title="Refresh feed"
            className="p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Row — Symmetrical, High-Contrast Government Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Compliance Ring */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col items-center justify-center gap-1.5">
          <ComplianceRing pct={compPct} isDark={isDark} />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">Statutory Compliance</p>
          <div className="flex items-center gap-1 text-[11px] text-slate-800 dark:text-slate-500">
            {trendIcon}
            <span className="capitalize font-medium">{summary.trend} Trend</span>
          </div>
        </div>

        {[
          { label: 'Persons Scanned Today', value: summary.total_persons_scanned_today, icon: Eye, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Total Violations Flagged', value: summary.total_violations_today, icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Critical Safety Alerts', value: summary.critical_violations, icon: ShieldAlert, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
          { label: 'Active Open Violations', value: summary.active_violations, icon: Zap, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Camera Grid */}
        <div className="xl:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-600 dark:text-slate-400" /> Camera Network
            </h2>
            <span className="text-xs text-slate-700 dark:text-slate-500 font-medium">
              {cameras.filter(c => c.is_active).length}/{cameras.length} online
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
            {cameras.map(cam => (
              <CameraCard key={cam.camera_id} cam={cam} latestEvent={latestByCamera[cam.camera_id]} />
            ))}
          </div>
        </div>

        {/* Zone Compliance Chart + Event Feed */}
        <div className="xl:col-span-2 space-y-5">

          {/* Zone Compliance Bar Chart */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Zone Compliance Index (24-Hour Average)
              </h2>
              <span className="text-xs text-slate-700 dark:text-slate-500">DGMS Standard: &ge;90%</span>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.zone_breakdown} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke={isDark ? '#94a3b8' : '#475569'} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="zone" stroke={isDark ? '#94a3b8' : '#475569'} tick={{ fontSize: 11 }} width={75} />
                  <Tooltip
                    formatter={(v: any) => [`${v ?? 0}%`, 'Compliance']}
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '8px',
                      color: isDark ? '#ffffff' : '#0f172a',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    itemStyle={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  />
                  <Bar dataKey="compliance_pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {summary.zone_breakdown.map((z) => (
                      <Cell 
                        key={z.zone}
                        fill={z.compliance_pct >= 90 ? (isDark ? '#10b981' : '#059669') : z.compliance_pct >= 75 ? (isDark ? '#f59e0b' : '#d97706') : (isDark ? '#ef4444' : '#dc2626')} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Event Feed */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Real-Time Detection Feed
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {filteredEvents.length} Logs
                </span>
                {liveMode && <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 uppercase"><Radio className="w-3 h-3 animate-pulse" /> Live</span>}
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Filter Camera / Zone..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 w-36 focus:w-44 transition-all outline-none"
                />
                {/* Zone filter */}
                <select 
                  value={filterZone} 
                  onChange={e => { setFilterZone(e.target.value); setCurrentPage(1); }}
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5"
                >
                  <option value="all">All Zones</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                {/* Status filter */}
                <select 
                  value={filterStatus} 
                  onChange={e => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5"
                >
                  <option value="all">All Status</option>
                  <option value="unresolved">Unresolved Only</option>
                  <option value="critical">Critical Violations</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {paginatedEvents.length === 0 && (
                <div className="text-center py-12 text-slate-700 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Violations Found</p>
                  <p className="text-xs text-slate-700 dark:text-slate-500">All workers in current filter are adhering to safety protocols.</p>
                </div>
              )}
              {paginatedEvents.map(event => (
                <EventRow key={event.id} event={event} onResolve={handleResolve} />
              ))}
            </div>

            {/* Scalable Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works Banner — Clean Government Explainer */}
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-600 dark:text-amber-500" /> Statutory Edge AI Architecture (DGMS Standard)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: '01', icon: Camera,       title: 'CCTV Stream Ingestion', desc: 'Captures high-resolution RTSP camera frames at 10-second intervals from underground & open-cast zones.' },
            { step: '02', icon: HardHat,      title: 'PPE Color Heuristic Engine',  desc: 'Runs local client-side color & spatial detection for mandatory ISI-marked hard hats and high-visibility vests.' },
            { step: '03', icon: ShieldAlert,  title: 'Severity Escalation',   desc: 'Missing PPE triggers instant severity classification (Critical, High, Medium) with audit timestamps.' },
            { step: '04', icon: TrendingUp,   title: 'Regulatory Audit Feed', desc: 'Securely batches scan logs into Supabase for DGMS safety registers and shift manager inspection.' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex gap-3 bg-white dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <div className="shrink-0">
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 block mb-1">{step}</span>
                <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
