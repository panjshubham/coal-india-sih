// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Droplets, FlaskConical, Activity, BarChart3, RefreshCw,
  AlertTriangle, CheckCircle, Info, Loader2, Zap, ChevronDown,
  ChevronUp, Upload, FileText, ShieldAlert, TrendingUp, Target,
  Brain, Download, AlertOctagon, Radio, Gauge, Sliders, Shield,
  FileSpreadsheet, Check, ArrowRight, Compass, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const AI_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000';

// ─── Types ─────────────────────────────────────────────────────────────────

interface KeyFeature {
  feature: string;
  shap: number;
  value: number;
  direction: 'positive' | 'negative';
}

interface PredictionResult {
  status: string;
  predicted_class: string;
  predicted_class_short: 'G1' | 'G2' | 'G3';
  class_index: number;
  probabilities: Record<string, number>;
  confidence: number;
  shap_values: Record<string, Record<string, number>>;
  shap_baseline: number;
  key_features: KeyFeature[];
}

interface ImportanceItem {
  feature: string;
  importance: number;
}

interface SHAPSummary {
  importance: Record<string, ImportanceItem[]>;
}

interface ModelStatus {
  model_ready: boolean;
  model_type: string;
  algorithm: string;
  paper_accuracy: string;
}

// ─── Constants & Metadata ───────────────────────────────────────────────────

const FEATURE_FIELDS = [
  { key: 'ca',       label: 'Ca²⁺',       unit: 'mg/L', hint: '0.1 – 6.0',  icon: '🧪' },
  { key: 'mg',       label: 'Mg²⁺',       unit: 'mg/L', hint: '0.1 – 2.5',  icon: '🧪' },
  { key: 'k_na',     label: 'K⁺ + Na⁺',   unit: 'mg/L', hint: '1.0 – 45',   icon: '🧪' },
  { key: 'hco3',     label: 'HCO₃⁻',      unit: 'mg/L', hint: '0.7 – 42',   icon: '🧪' },
  { key: 'cl',       label: 'Cl⁻',        unit: 'mg/L', hint: '0.5 – 4.0',  icon: '🧪' },
  { key: 'so4',      label: 'SO₄²⁻',      unit: 'mg/L', hint: '0.0 – 1.2',  icon: '🧪' },
  { key: 'hardness', label: 'Hardness',   unit: 'mg/L', hint: '0.8 – 22',   icon: '💧' },
  { key: 'ph',       label: 'pH',         unit: '',     hint: '6.5 – 10.0', icon: '📊' },
];

const DEMO_SAMPLES: Record<string, Record<string, number>> = {
  'G1 — Ordovician Limestone': { ca: 0.32, mg: 0.48, k_na: 2.15, hco3: 0.90, cl: 1.15, so4: 0.03, hardness: 2.24, ph: 9.30 },
  'G2 — Tai-grey Water':       { ca: 4.20, mg: 1.94, k_na: 1.96, hco3: 6.67, cl: 0.76, so4: 0.68, hardness: 17.24, ph: 7.15 },
  'G3 — Coal Series Water':    { ca: 0.22, mg: 0.19, k_na: 31.38, hco3: 26.81, cl: 0.71, so4: 0.05, hardness: 1.15, ph: 8.50 },
};

const CLASS_META = {
  G1: {
    name: 'Ordovician Limestone Water',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.15)',
    border: '#06b6d4',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    desc: 'Deep karst aquifer — high pH, low HCO₃⁻, low K⁺+Na⁺',
    severity: 'HIGH',
    facies: 'Ca-HCO₃ / Karst Aquifer Type',
    action: 'Activate deep water drainage system immediately. Initiate high-pressure karst grouting and alert DGMS Zone Controller.',
  },
  G2: {
    name: 'Tai-grey Water',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.15)',
    border: '#f59e0b',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Carboniferous Taiyuan limestone — high Hardness signature',
    severity: 'MEDIUM',
    facies: 'Ca-Mg-SO₄ / Carboniferous Type',
    action: 'Monitor limestone fracture zones. Check drainage intercept capacity and fortify coal seam barrier pillars.',
  },
  G3: {
    name: 'Coal Series Sandstone Water',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.15)',
    border: '#10b981',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Coal seam pore water — very high K⁺+Na⁺ and HCO₃⁻',
    severity: 'LOW',
    facies: 'Na-HCO₃ / Pore Aquifer Type',
    action: 'Standard roof drainage protocol. Increase dewatering pump frequency and track roof water pressure drops.',
  },
};

// ─── Hydrochemical Piper Calculation Helper ──────────────────────────────────

function calculateMeq(form: Record<string, string>) {
  const ca = parseFloat(form.ca) || 0;
  const mg = parseFloat(form.mg) || 0;
  const kna = parseFloat(form.k_na) || 0;
  const hco3 = parseFloat(form.hco3) || 0;
  const cl = parseFloat(form.cl) || 0;
  const so4 = parseFloat(form.so4) || 0;

  // Convert mg/L to meq/L
  const ca_meq = ca / 20.04;
  const mg_meq = mg / 12.15;
  const kna_meq = kna / 22.99;

  const hco3_meq = hco3 / 61.016;
  const cl_meq = cl / 35.453;
  const so4_meq = so4 / 48.03;

  const total_cat = Math.max(ca_meq + mg_meq + kna_meq, 0.0001);
  const total_an = Math.max(hco3_meq + cl_meq + so4_meq, 0.0001);

  const ca_pct = (ca_meq / total_cat) * 100;
  const mg_pct = (mg_meq / total_cat) * 100;
  const kna_pct = (kna_meq / total_cat) * 100;

  const hco3_pct = (hco3_meq / total_an) * 100;
  const cl_pct = (cl_meq / total_an) * 100;
  const so4_pct = (so4_meq / total_an) * 100;

  return { ca_pct, mg_pct, kna_pct, hco3_pct, cl_pct, so4_pct, total_cat, total_an };
}

// ─── Piper Trilinear Diagram SVG Component ───────────────────────────────────

function PiperDiagram({ form, color }: { form: Record<string, string>; color: string }) {
  const meq = calculateMeq(form);

  // SVG Coordinates setup
  const W = 320, H = 280;

  // Cation Triangle (Left Bottom)
  const catOrigin = { x: 70, y: 250 };
  const triangleSide = 100;
  const triangleHeight = (Math.sqrt(3) / 2) * triangleSide;

  const catApex = { x: catOrigin.x + triangleSide / 2, y: catOrigin.y - triangleHeight };
  const catRight = { x: catOrigin.x + triangleSide, y: catOrigin.y };

  // Cation point position (Ca bottom-left, Mg top, K+Na bottom-right)
  // Barycentric coordinates
  const catX = catOrigin.x + (meq.kna_pct / 100) * triangleSide + (meq.mg_pct / 100) * (triangleSide / 2);
  const catY = catOrigin.y - (meq.mg_pct / 100) * triangleHeight;

  // Anion Triangle (Right Bottom)
  const anOrigin = { x: 170, y: 250 };
  const anApex = { x: anOrigin.x + triangleSide / 2, y: anOrigin.y - triangleHeight };
  const anRight = { x: anOrigin.x + triangleSide, y: anOrigin.y };

  // Anion point position (Cl bottom-left, SO4 top, HCO3 bottom-right)
  const anX = anOrigin.x + (meq.hco3_pct / 100) * triangleSide + (meq.so4_pct / 100) * (triangleSide / 2);
  const anY = anOrigin.y - (meq.so4_pct / 100) * triangleHeight;

  // Central Diamond (Top)
  const dCenter = { x: 170, y: 110 };
  const dTop = { x: dCenter.x, y: dCenter.y - triangleHeight };
  const dLeft = { x: dCenter.x - triangleSide / 2, y: dCenter.y };
  const dRight = { x: dCenter.x + triangleSide / 2, y: dCenter.y };
  const dBottom = { x: dCenter.x, y: dCenter.y + triangleHeight };

  // Diamond Projected Point
  // Project cation and anion lines into diamond
  const projX = (catX + anX - (anOrigin.x - catOrigin.x)) / 2 + 50;
  const projY = (catY + anY) / 2 - 70;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Piper Hydrochemical Facies Plot
        </span>
        <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          meq% Trilinear
        </span>
      </div>

      <svg width={W} height={H} className="overflow-visible">
        {/* Cation Triangle */}
        <polygon
          points={`${catOrigin.x},${catOrigin.y} ${catApex.x},${catApex.y} ${catRight.x},${catRight.y}`}
          fill="rgba(30, 41, 59, 0.5)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <text x={catOrigin.x - 12} y={catOrigin.y + 12} fill="#94a3b8" fontSize="9" fontWeight="bold">Ca²⁺</text>
        <text x={catApex.x - 8} y={catApex.y - 6} fill="#94a3b8" fontSize="9" fontWeight="bold">Mg²⁺</text>
        <text x={catRight.x - 5} y={catRight.y + 12} fill="#94a3b8" fontSize="9" fontWeight="bold">Na⁺+K⁺</text>

        {/* Anion Triangle */}
        <polygon
          points={`${anOrigin.x},${anOrigin.y} ${anApex.x},${anApex.y} ${anRight.x},${anRight.y}`}
          fill="rgba(30, 41, 59, 0.5)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <text x={anOrigin.x - 8} y={anOrigin.y + 12} fill="#94a3b8" fontSize="9" fontWeight="bold">Cl⁻</text>
        <text x={anApex.x - 8} y={anApex.y - 6} fill="#94a3b8" fontSize="9" fontWeight="bold">SO₄²⁻</text>
        <text x={anRight.x - 8} y={anRight.y + 12} fill="#94a3b8" fontSize="9" fontWeight="bold">HCO₃⁻</text>

        {/* Central Diamond */}
        <polygon
          points={`${dTop.x},${dTop.y} ${dRight.x},${dRight.y} ${dBottom.x},${dBottom.y} ${dLeft.x},${dLeft.y}`}
          fill="rgba(30, 41, 59, 0.3)"
          stroke="#64748b"
          strokeWidth="1.5"
        />

        {/* Projection Guide Lines */}
        <line x1={catX} y1={catY} x2={projX} y2={projY} stroke="#0284c7" strokeDasharray="2,2" strokeWidth="1" opacity="0.6" />
        <line x1={anX} y1={anY} x2={projX} y2={projY} stroke="#0284c7" strokeDasharray="2,2" strokeWidth="1" opacity="0.6" />

        {/* Cation Point */}
        <circle cx={catX} cy={catY} r="4.5" fill={color} stroke="#ffffff" strokeWidth="1.5" />

        {/* Anion Point */}
        <circle cx={anX} cy={anY} r="4.5" fill={color} stroke="#ffffff" strokeWidth="1.5" />

        {/* Diamond Facies Point */}
        <circle cx={projX} cy={projY} r="6" fill={color} stroke="#ffffff" strokeWidth="2" className="animate-pulse" />
      </svg>

      {/* meq% Breakdown */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
        <div className="text-slate-400">
          Cations: <span className="text-white font-bold">Ca {meq.ca_pct.toFixed(0)}%</span> | <span className="text-white">Mg {meq.mg_pct.toFixed(0)}%</span>
        </div>
        <div className="text-slate-400 text-right">
          Anions: <span className="text-white font-bold">HCO₃ {meq.hco3_pct.toFixed(0)}%</span> | <span className="text-white">SO₄ {meq.so4_pct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── SHAP Waterfall & Gauge Components ─────────────────────────────────────

function SHAPWaterfall({ result }: { result: PredictionResult }) {
  const features = result.key_features;
  const baseline = result.shap_baseline ?? 0;
  const maxAbs = Math.max(...features.map(f => Math.abs(f.shap)), 0.01);

  let cumulative = baseline;
  const bars = features.map(f => {
    const start = cumulative;
    cumulative += f.shap;
    return { ...f, start, end: cumulative };
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-slate-400" />
        <span className="text-xs text-slate-400">Baseline: {baseline.toFixed(3)}</span>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Positive (promotes class)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Negative (suppresses class)</span>
        </div>
      </div>
      {bars.map((b) => {
        const pct = (Math.abs(b.shap) / maxAbs) * 100;
        const isPos = b.shap > 0;
        return (
          <div key={b.feature} className="flex items-center gap-3">
            <div className="w-20 text-right text-xs font-mono text-slate-300 shrink-0">{b.feature}</div>
            <div className="flex-1 relative h-7 flex items-center">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" />
              {isPos ? (
                <div
                  className="absolute left-1/2 h-5 rounded-r bg-emerald-500 flex items-center justify-end pr-2"
                  style={{ width: `${pct / 2}%` }}
                >
                  <span className="text-[10px] text-white font-bold whitespace-nowrap ml-1">+{b.shap.toFixed(3)}</span>
                </div>
              ) : (
                <div
                  className="absolute right-1/2 h-5 rounded-l bg-rose-500 flex items-center justify-start pl-2"
                  style={{ width: `${pct / 2}%` }}
                >
                  <span className="text-[10px] text-white font-bold whitespace-nowrap mr-1">{b.shap.toFixed(3)}</span>
                </div>
              )}
            </div>
            <div className="w-16 text-xs font-mono text-slate-400 shrink-0">= {b.value.toFixed(2)}</div>
          </div>
        );
      })}
      <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
        <span className="text-xs text-slate-400">Final model log-odds output f(x)</span>
        <span className="text-sm font-bold text-white font-mono">
          {(baseline + features.reduce((s, f) => s + f.shap, 0)).toFixed(3)}
        </span>
      </div>
    </div>
  );
}

function ConfidenceGauge({ value, color }: { value: number; color: string }) {
  const r = 54;
  const cx = 64, cy = 64;
  const startAngle = Math.PI;
  const endAngle = Math.PI + (value / 100) * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = value > 50 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="80" viewBox="0 0 128 80">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
          {value}%
        </text>
      </svg>
      <span className="text-xs text-slate-400 -mt-2">AI Confidence</span>
    </div>
  );
}

function GlobalSHAPChart({ data }: { data: ImportanceItem[] }) {
  const max = Math.max(...data.map(d => d.importance), 0.01);
  const COLORS = ['#06b6d4', '#06b6d4bb', '#06b6d488', '#06b6d455', '#06b6d433', '#06b6d422', '#06b6d411', '#06b6d408'];
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={item.feature} className="flex items-center gap-3">
          <span className="w-20 text-right text-xs text-slate-400 shrink-0">{item.feature}</span>
          <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
              style={{ width: `${(item.importance / max) * 100}%`, background: COLORS[i % COLORS.length] }}
            >
              <span className="text-[10px] text-white font-bold">{item.importance.toFixed(4)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WaterInrushAnalysis() {
  const [mode, setMode] = useState<'lab' | 'telemetry' | 'batch'>('lab');
  const [form, setForm] = useState<Record<string, string>>({
    ca: '0.32', mg: '0.48', k_na: '2.15', hco3: '0.90', cl: '1.15', so4: '0.03', hardness: '2.24', ph: '9.30'
  });
  
  // SCADA Sensor Stream Simulation
  const [telemetry, setTelemetry] = useState({
    inflowRate: 48.5, // L/sec
    pressure: 2.14,    // MPa
    conductivity: 620, // µS/cm
    temp: 24.2,        // °C
    boreholeId: 'BH-SEAM3-NORTH'
  });

  const [loading, setLoading]         = useState(false);
  const [result, setResult]          = useState<PredictionResult | null>(null);
  const [shapSummary, setSHAPSummary] = useState<SHAPSummary | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [training, setTraining]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [activeClass, setActiveClass] = useState<'G1' | 'G2' | 'G3' | 'overall'>('overall');
  const [showShap, setShowShap]       = useState(true);
  const [shapTab, setShapTab]         = useState<'waterfall' | 'global' | 'piper'>('waterfall');
  const [autoMode, setAutoMode]       = useState(true);

  // Batch CSV State
  const [batchFile, setBatchFile]     = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  const { user } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  // Telemetry fluctuation simulator
  useEffect(() => {
    if (mode !== 'telemetry') return;
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        inflowRate: +(prev.inflowRate + (Math.random() * 2 - 1)).toFixed(1),
        pressure: +(prev.pressure + (Math.random() * 0.04 - 0.02)).toFixed(2),
        conductivity: Math.round(prev.conductivity + (Math.random() * 6 - 3))
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  const executePredict = async (customForm?: Record<string, string>) => {
    const targetForm = customForm || form;
    setError(null);
    setReported(false);
    const body: Record<string, number> = {};
    for (const f of FEATURE_FIELDS) {
      const v = parseFloat(targetForm[f.key]);
      if (isNaN(v)) { setError(`Please enter a valid number for ${f.label}`); return; }
      body[f.key] = v;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${AI_URL}/water-inrush/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const e = await resp.json();
        throw new Error(e.detail || resp.statusText);
      }
      const data: PredictionResult = await resp.json();
      setResult(data);
      setShapTab('waterfall');
    } catch (e: any) {
      setError(e.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  // Poll model status on mount and auto-predict initial sample
  useEffect(() => {
    fetch(`${AI_URL}/water-inrush/status`)
      .then(r => r.json())
      .then(status => {
        setModelStatus(status);
        if (status.model_ready) {
          executePredict({
            ca: '0.32', mg: '0.48', k_na: '2.15', hco3: '0.90', cl: '1.15', so4: '0.03', hardness: '2.24', ph: '9.30'
          });
        }
      })
      .catch(() => {});
  }, []);

  // Fetch SHAP summary when model is ready
  useEffect(() => {
    if (modelStatus?.model_ready) {
      fetch(`${AI_URL}/water-inrush/shap-summary`)
        .then(r => r.json())
        .then(d => { if (d.status === 'ok') setSHAPSummary(d); })
        .catch(() => {});
    }
  }, [modelStatus]);

  const handleChange = (key: string, val: string) => {
    const nextForm = { ...form, [key]: val };
    setForm(nextForm);
  };

  const loadDemo = (name: string) => {
    const s = DEMO_SAMPLES[name];
    const newForm = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, String(v)]));
    setForm(newForm);
    setError(null);
    if (autoMode) {
      executePredict(newForm);
    } else {
      setResult(null);
    }
  };

  const handlePredict = () => {
    executePredict();
  };

  const handleReport = async () => {
    if (!result || !user) return;
    setReporting(true);
    try {
      const { data: uData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
      if (uData?.assigned_mine_id) {
        await supabase.from('violations').insert({
          mine_id: uData.assigned_mine_id,
          category: 'safety',
          severity: 'high',
          description: `EMERGENCY WATER INRUSH RISK DETECTED: ${CLASS_META[result.predicted_class_short].name} (${result.predicted_class_short}). AI Confidence: ${result.confidence.toFixed(1)}%. Immediate evacuation and drainage protocols must be initiated.`,
          status: 'open'
        });
        setReported(true);
      }
    } catch (e) {
      console.error('Failed to escalate risk to dashboard', e);
    }
    setReporting(false);
  };

  const handleTrain = async () => {
    setTraining(true);
    setError(null);
    try {
      const resp = await fetch(`${AI_URL}/water-inrush/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_clssa: true, clssa_pop: 30, clssa_iter: 20 })
      });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.detail || resp.statusText);
      const statusResp = await fetch(`${AI_URL}/water-inrush/status`);
      setModelStatus(await statusResp.json());
      const shapResp = await fetch(`${AI_URL}/water-inrush/shap-summary`);
      const shapD = await shapResp.json();
      if (shapD.status === 'ok') setSHAPSummary(shapD);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTraining(false);
    }
  };

  const handlePrintAuditReport = () => {
    window.print();
  };

  const meta = result ? CLASS_META[result.predicted_class_short] : null;
  const globalData = shapSummary?.importance?.[activeClass] ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8">
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/10">
              <Droplets className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
                  Mine Water Leakage &amp; Inrush AI Workbench
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Live Inference Engine
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                CLSSA-XGBoost + SHAP · Hydrochemical Facies Fingerprinting &amp; Statutory Evacuation Decision System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                autoMode
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              {autoMode ? 'Auto-Predict: ON' : 'Auto-Predict: OFF'}
            </button>

            {result && (
              <button
                onClick={handlePrintAuditReport}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Export Audit PDF
              </button>
            )}
          </div>
        </div>

        {/* ── Mode Selection Pills ──────────────────────────────────── */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl mb-4 w-fit">
          <button
            onClick={() => setMode('lab')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              mode === 'lab'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Lab Sample Hydro-Chemical
          </button>
          <button
            onClick={() => setMode('telemetry')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              mode === 'telemetry'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            SCADA Inflow Telemetry Stream
          </button>
        </div>

        {/* ── AI Model Specifications & Architecture Badge ─────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              Primary AI Model
            </div>
            <div className="text-sm font-bold text-cyan-300">CLSSA-XGBoost</div>
            <div className="text-[11px] text-slate-400">Multi-class Gradient Boosted Trees</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Optimizer Engine
            </div>
            <div className="text-sm font-bold text-amber-300">CLSSA Algorithm</div>
            <div className="text-[11px] text-slate-400">Tent Chaos + Levy Flight Search</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Explainability (XAI)
            </div>
            <div className="text-sm font-bold text-emerald-300">TreeSHAP Explainer</div>
            <div className="text-[11px] text-slate-400">Exact Shapley Ion Attribution</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              Paper Benchmark
            </div>
            <div className="text-sm font-bold text-purple-300">97.78% Precision</div>
            <div className="text-[11px] text-slate-400">Kou &amp; Wen (Nature Portfolio 2025)</div>
          </div>
        </div>

        {/* Model status bar */}
        {modelStatus && (
          <div className={`mt-3 flex flex-wrap items-center gap-3 px-4 py-2 rounded-xl border text-xs ${
            modelStatus.model_ready
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}>
            {modelStatus.model_ready
              ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              : <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
            <span className="font-semibold">{modelStatus.model_type}</span>
            <span className="text-slate-500">•</span>
            <span>{modelStatus.algorithm}</span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-emerald-400">{modelStatus.paper_accuracy}</span>
            {!modelStatus.model_ready && (
              <button
                onClick={handleTrain}
                disabled={training}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition disabled:opacity-50"
              >
                {training ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {training ? 'Optimizing Parameters…' : 'Train Model'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main Layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* ── Input / Telemetry Panel ────────────────────────────────────────────── */}
        <div className="xl:col-span-1 space-y-4">
          
          {mode === 'telemetry' && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                  <Radio className="w-4 h-4 animate-pulse" />
                  SCADA Live Borehole Stream
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {telemetry.boreholeId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Inflow Rate</div>
                  <div className="text-lg font-bold font-mono text-amber-400">{telemetry.inflowRate} L/s</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Karst Pressure</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">{telemetry.pressure} MPa</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-[11px] text-slate-400">EC Conductivity</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">{telemetry.conductivity} µS/cm</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-[11px] text-slate-400">Water Temp</div>
                  <div className="text-lg font-bold font-mono text-slate-200">{telemetry.temp} °C</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-normal">
                Continuous IoT sensor telemetry indicates active seepage in Seam 3 North face. Run hydrochemical model to identify origin aquifer.
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold flex items-center gap-2 font-sans text-slate-900 dark:text-white">
                <FlaskConical className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                Hydrochemical Ion Indicators
              </div>
              <span className="text-xs text-slate-500 font-medium">8 discriminant features</span>
            </div>

            {/* Demo samples */}
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Load paper demo sample:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DEMO_SAMPLES).map(name => (
                  <button key={name}
                    onClick={() => loadDemo(name)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                  >{name}</button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              {FEATURE_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{f.icon} {f.label} {f.unit && <span className="text-slate-500 font-medium">({f.unit})</span>}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{f.hint}</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form[f.key]}
                    onChange={e => handleChange(f.key, e.target.value)}
                    placeholder={f.hint}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-sm"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handlePredict}
              disabled={loading || !modelStatus?.model_ready}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-cyan-600/20"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Classifying Aquifer…</>
                : <><Brain className="w-4 h-4" /> Identify Inrush Source</>}
            </button>

            {/* Re-train button */}
            {modelStatus?.model_ready && (
              <button
                onClick={handleTrain}
                disabled={training}
                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:border-cyan-600 hover:text-cyan-400 text-xs transition disabled:opacity-40 cursor-pointer"
              >
                {training ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {training ? 'Re-optimizing CLSSA…' : 'Re-train CLSSA Hyperparameters'}
              </button>
            )}
          </div>

          {/* Info card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800 dark:text-slate-300">CLSSA Hyperparameter Tuning</strong>
                <p className="mt-1">Tent chaos mapping initialises the sparrow population for maximum search-space coverage. Levy flight strategy lets joiners escape local optima to optimize <em>n_estimators</em>, <em>max_depth</em>, and <em>learning_rate</em>.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Results Panel ─────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {!result && !loading && (
            <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
              <Droplets className="w-12 h-12 mb-3 opacity-30 text-cyan-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Enter hydrochemical values and click <strong>Identify Inrush Source</strong></p>
              <p className="text-xs mt-1 opacity-70 text-slate-500">or load a demo sample from Table 1 of the paper</p>
            </div>
          )}

          {loading && (
            <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-500 dark:text-cyan-400 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Running CLSSA-XGBoost inference &amp; TreeSHAP attribution…</p>
            </div>
          )}

          {result && meta && (
            <>
              {/* ── Prediction Result Card ─── */}
              <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm" style={{ borderColor: meta.border }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <ConfidenceGauge value={result.confidence} color={meta.color} />
                    <div>
                      <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${meta.badge}`}>
                        <Activity className="w-3.5 h-3.5" />
                        Identified Water Source Class
                      </div>
                      <div className="text-2xl md:text-3xl font-black font-serif tracking-wide" style={{ color: meta.color }}>
                        {result.predicted_class_short} — {meta.name}
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-1">Facies: <span className="text-slate-200 font-bold">{meta.facies}</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
                    </div>
                  </div>

                  {/* Class Probabilities */}
                  <div className="space-y-2 min-w-[180px]">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono font-bold">Probability Matrix</div>
                    {Object.entries(result.probabilities).map(([cls, prob]) => {
                      const m = CLASS_META[cls as keyof typeof CLASS_META];
                      return (
                        <div key={cls} className="flex items-center gap-3">
                          <span className="text-xs w-6 font-mono text-slate-400">{cls}</span>
                          <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${prob}%`, background: m?.color }} />
                          </div>
                          <span className="text-xs font-mono w-12 text-right font-bold" style={{ color: m?.color }}>
                            {prob.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Safety Action Directive */}
                <div className="mt-5 flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-xl" style={{ background: meta.bg, border: `1px solid ${meta.border}40` }}>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" style={{ color: meta.color }} />
                    <div>
                      <span className="text-sm font-bold tracking-wide uppercase" style={{ color: meta.color }}>
                        Statutory Protocol · Risk Severity: {meta.severity}
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                        {meta.action}
                      </p>
                    </div>
                  </div>
                  {(result.predicted_class_short === 'G1' || result.predicted_class_short === 'G2') && (
                    <button
                      onClick={handleReport}
                      disabled={reporting || reported}
                      className={`shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition shadow-sm border cursor-pointer ${
                        reported 
                          ? 'bg-emerald-500 text-white border-emerald-600 cursor-not-allowed'
                          : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700'
                      }`}
                    >
                      {reporting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Escalating…</>
                      ) : reported ? (
                        <><CheckCircle className="w-4 h-4" /> Escalated to Emergency HQ</>
                      ) : (
                        <><AlertOctagon className="w-4 h-4" /> Escalate Emergency Notice</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Piper Hydrochemical Diagram & SHAP Tabs ─── */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <BarChart3 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                    Hydrochemical Diagnostics &amp; Explainability
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShapTab('piper')}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                        shapTab === 'piper' 
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Piper Diagram
                    </button>
                    <button 
                      onClick={() => setShapTab('waterfall')}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                        shapTab === 'waterfall' 
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' 
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      SHAP Waterfall
                    </button>
                    <button 
                      onClick={() => setShapTab('global')}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer ${
                        shapTab === 'global' 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Global Feature Importance
                    </button>
                  </div>
                </div>

                {shapTab === 'piper' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Piper trilinear classification plots ionic ratios in milliequivalents per liter (meq/L) to verify hydro-facies classification.
                    </p>
                    <PiperDiagram form={form} color={meta.color} />
                  </div>
                )}

                {shapTab === 'waterfall' && (
                  <>
                    <p className="text-xs text-slate-400 mb-4">
                      Local SHAP attribution — shows how each indicator shifted prediction towards
                      <span className="font-bold text-white mx-1">{result.predicted_class_short} ({meta.name})</span>
                    </p>
                    <SHAPWaterfall result={result} />
                  </>
                )}

                {shapTab === 'global' && shapSummary && (
                  <>
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {(['overall', 'G1', 'G2', 'G3'] as const).map(c => (
                        <button key={c}
                          onClick={() => setActiveClass(c)}
                          className={`text-xs px-3 py-1 rounded-lg border transition ${activeClass === c ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                          {c === 'overall' ? 'Overall Model' : CLASS_META[c].name.split(' ')[0] + ' (' + c + ')'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Mean |SHAP| values across all {activeClass === 'overall' ? 'classes' : CLASS_META[activeClass as 'G1' | 'G2' | 'G3'].name} dataset samples
                    </p>
                    <GlobalSHAPChart data={globalData} />
                  </>
                )}
              </div>

              {/* ── Key Features Summary ─── */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5">
                <div className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 font-sans">
                  <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  Top Ion Discriminators (Shapley Value Contribution)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {result.key_features.slice(0, 4).map(kf => (
                    <div key={kf.feature}
                      className={`p-3 rounded-xl border ${kf.direction === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-bold text-white">{kf.feature}</span>
                        <span className={`text-xs font-bold font-mono ${kf.direction === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {kf.shap > 0 ? '+' : ''}{kf.shap.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Measured: <span className="text-white font-mono">{kf.value}</span></span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${kf.direction === 'positive' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {kf.direction === 'positive' ? '↑ promotes class' : '↓ opposes class'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Global SHAP (no prediction yet) ─── */}
          {!result && shapSummary && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5">
              <div className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2 font-sans">
                <BarChart3 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                Global Hydrochemical Feature Importance
              </div>
              <p className="text-xs text-slate-500 mb-4">Mean |SHAP| values — shows which ionic indicators carry highest weight</p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {(['overall', 'G1', 'G2', 'G3'] as const).map(c => (
                  <button key={c}
                    onClick={() => setActiveClass(c)}
                    className={`text-xs px-3 py-1 rounded-lg border transition ${activeClass === c ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                    {c === 'overall' ? 'Overall' : CLASS_META[c].name.split(' ')[0] + ' (' + c + ')'}
                  </button>
                ))}
              </div>
              <GlobalSHAPChart data={globalData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
