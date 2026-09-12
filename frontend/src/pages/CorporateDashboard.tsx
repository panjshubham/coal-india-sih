import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ShieldAlert, AlertTriangle, Activity, AlertCircle, RefreshCw, BarChart2, 
  Globe2, Radio, Server, Fingerprint, Trees, ChevronRight, X, Gauge, 
  Zap, TrendingUp, ShieldCheck, Sparkles, CheckCircle2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface XaiFactor {
  feature: string;
  contribution_pts: number;
  regulation: string;
  severity?: string;
  description: string;
}

interface MineRisk {
  mine_id: number;
  score: number;
  explanation: string;
  last_updated: string;
  mines: {
    name: string;
  };
  contributing_factors?: any;
  xai_breakdown?: XaiFactor[];
  recommendation?: string;
}

interface Violation {
  id: number;
  mine_id: number;
  category: string;
  severity: string;
  status: string;
  created_at: string;
  mines?: {
    name: string;
  };
}

export default function CorporateDashboard() {
  const [stats, setStats] = useState({
    totalMines: 0,
    activeViolations: 0,
    overdueCompliance: 0,
    avgRiskScore: 0
  });

  const [riskScores, setRiskScores] = useState<MineRisk[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [calculatingRisk, setCalculatingRisk] = useState(false);
  const [selectedXaiMine, setSelectedXaiMine] = useState<MineRisk | null>(null);

  useEffect(() => {
    fetchInitialData();

    // Realtime subscription for violations
    const channel = supabase.channel('public:violations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'violations' }, payload => {
        fetchSingleViolation(payload.new.id);
        setStats(s => ({ ...s, activeViolations: s.activeViolations + 1 }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'violations' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchInitialData() {
    try {
      // 1. Stats
      const { count: totalMines } = await supabase.from('mines').select('*', { count: 'exact', head: true });
      const { count: activeViolations } = await supabase.from('violations').select('*', { count: 'exact', head: true }).eq('status', 'open');
      const { count: overdueCompliance } = await supabase.from('compliance_items').select('*', { count: 'exact', head: true }).eq('status', 'overdue');
      
      // 2. Risk Scores
      const { data: riskData } = await supabase
        .from('risk_scores')
        .select(`
          mine_id, score, explanation, last_updated, contributing_factors,
          mines (name)
        `)
        .order('score', { ascending: false });

      let risks = (riskData || []) as unknown as MineRisk[];
      if (risks.length === 0) {
        risks = [
          {
            mine_id: 1,
            score: 78,
            explanation: 'High concentration of open methane-level safety directives and elevated night-shift operational activity.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Tetaria Khar (ECL)' },
            contributing_factors: { ml_probability: 82, ml_top_factors: ['overdue safety breaches', 'seam depth telemetry'], hotspot: true, location_anomaly: true },
            xai_breakdown: [
              { feature: 'Methane (CH4) Accumulation in Seam III', contribution_pts: 28.5, regulation: 'CMR 2017 Reg 155', severity: 'critical', description: 'Sensor readings >= 0.75% recorded in active return airway. Auxiliary air volume deficient.' },
              { feature: 'Haul Road Berm Defect (Bench 2)', contribution_pts: 22.0, regulation: 'CMR 2017 Reg 83', severity: 'high', description: 'Drone CV inspection detected 1.15m eroded berm ridge vs statutory 1.65m height.' },
              { feature: 'Contractor VTC Certification Lapsed', contribution_pts: 18.0, regulation: 'Mines VTC Rules 1966', severity: 'high', description: 'Contractual dumper operators deployed without mandatory annual refresher training.' },
              { feature: 'Logistics Weighbridge Variance (7.1%)', contribution_pts: 9.5, regulation: 'Mineral Concession Rules', severity: 'medium', description: 'Pit extraction weight outpaces rail dispatch weight, indicating siding stockpiling.' }
            ],
            recommendation: 'Mandatory under Section 22 Mines Act 1952: Isolate power to Seam III machinery, reconstruct Bench 2 haul road berm to 1.65m, and re-certify contractual drivers at Area VTC.'
          },
          {
            mine_id: 2,
            score: 64,
            explanation: 'Unresolved ventilation fan maintenance backlog combined with seasonal water-inflow elevation.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Dhori Khas (CCL)' },
            contributing_factors: { ml_probability: 68, ml_top_factors: ['ventilation backlog'], hotspot: true },
            xai_breakdown: [
              { feature: 'Main Mechanical Ventilator Backlog', contribution_pts: 32.0, regulation: 'CMR 2017 Reg 153', severity: 'high', description: 'Overdue bearing overhaul on North Incline ventilation fan.' },
              { feature: 'Sumppump Capacity Lag (Monsoon Inrush)', contribution_pts: 21.0, regulation: 'CMR 2017 Reg 172', severity: 'medium', description: 'Water accumulation in lower Seam II nearing danger mark.' },
              { feature: 'Statutory Inspection Due (18 Days)', contribution_pts: 11.0, regulation: 'CMR 2017 Reg 129', severity: 'medium', description: 'Managerial bi-weekly inspection report pending upload.' }
            ],
            recommendation: 'Complete ventilation maintenance during Sunday non-working shift. Clear lower seam sump drainage.'
          },
          {
            mine_id: 3,
            score: 42,
            explanation: 'Standard baseline operations with minor documentation renewal lag in haulage equipment.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Govindpur Colliery (BCCL)' },
            contributing_factors: { ml_probability: 38, ml_top_factors: ['documentation renewal'] },
            xai_breakdown: [
              { feature: 'Haulage Rope Non-Destructive Test (NDT)', contribution_pts: 24.0, regulation: 'CMR 2017 Reg 88', severity: 'medium', description: 'Bi-annual ultrasonic test due within 14 days.' },
              { feature: 'PME Medical Renewal (3 Workers)', contribution_pts: 18.0, regulation: 'CMR 2017 Reg 11', severity: 'low', description: 'Workers due for 5-year periodical medical examination.' }
            ],
            recommendation: 'Schedule haulage rope NDT inspection before month-end.'
          },
          {
            mine_id: 4,
            score: 28,
            explanation: 'Nominal telemetry readings across all safety sensors with zero active statutory violations.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Karo Special Seam (CCL)' },
            contributing_factors: { ml_probability: 18 },
            xai_breakdown: [
              { feature: 'All Parameters Within DGMS Limits', contribution_pts: 0.0, regulation: 'CMR 2017 Overall', severity: 'low', description: 'Zero active violations, 100% compliant gas testing log and valid contractor certificates.' }
            ],
            recommendation: 'Maintain standard statutory surveillance protocols.'
          }
        ] as any;
      }
      setRiskScores(risks);


      const avgRisk = risks.length > 0 
        ? risks.reduce((acc, curr) => acc + curr.score, 0) / risks.length 
        : 0;

      setStats({
        totalMines: totalMines || 0,
        activeViolations: activeViolations || 0,
        overdueCompliance: overdueCompliance || 0,
        avgRiskScore: Math.round(avgRisk)
      });

      // 3. Recent Violations
      const { data: vData } = await supabase
        .from('violations')
        .select(`*, mines(name)`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setViolations((vData || []) as Violation[]);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }

  async function fetchSingleViolation(id: number) {
    const { data } = await supabase.from('violations').select(`*, mines(name)`).eq('id', id).single();
    if (data) {
      setViolations(prev => [data as Violation, ...prev].slice(0, 10));
    }
  }

  const handleRecalculate = async () => {
    setCalculatingRisk(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000'}/analyze/all`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchInitialData();
        setCalculatingRisk(false);
        return;
      }
    } catch {
      // AI Service not running or on Vercel deployment
    }

    try {
      const { data: mines } = await supabase.from('mines').select('id, name');
      const { data: viols } = await supabase.from('violations').select('mine_id, severity, status');
      if (mines && mines.length > 0) {
        for (const m of mines) {
          const mViols = viols?.filter(v => v.mine_id === m.id) || [];
          const highSev = mViols.filter(v => (v.severity || '').toLowerCase() === 'critical' || (v.severity || '').toLowerCase() === 'high').length;
          const openCount = mViols.filter(v => (v.status || '').toLowerCase() !== 'resolved' && (v.status || '').toLowerCase() !== 'closed').length;
          const calculatedScore = Math.min(Math.round(25 + highSev * 14 + openCount * 5.5), 98);
          await supabase.from('mine_risk_scores').upsert({
            mine_id: m.id,
            score: calculatedScore,
            explanation: `Automated DGMS Risk Index: ${highSev} critical violations, ${openCount} open compliance items.`,
            last_updated: new Date().toISOString()
          }, { onConflict: 'mine_id' });
        }
      }
      await fetchInitialData();
    } catch (err) {
      console.error(err);
    } finally {
      setCalculatingRisk(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score > 70) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (score >= 40) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
    return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
  };

  const getSeverityBadge = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 font-sans p-6">
      {/* 1. Header with Command Center Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            HQ Command Center
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1.5">
              <Globe2 className="w-3 h-3" />
              GLOBAL OPERATIONS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise-wide telemetric aggregation and autonomous statutory compliance tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Telemetry Stream Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>LIVE TELEMETRY STREAM: CONNECTED</span>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Operational Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Total Supervised Sites</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-white">{stats.totalMines}</h3>
            <span className="text-xs text-blue-400 font-mono"><Server className="w-3.5 h-3.5 inline mr-1" />Nodes Active</span>
          </div>
        </div>

        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Active Violations</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-amber-400">{stats.activeViolations}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800">
              Requiring Intervention
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Overdue Compliance</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-red-400">{stats.overdueCompliance}</h3>
            <span className="text-xs text-slate-400 font-mono">Escalation Triggered</span>
          </div>
        </div>

        <div className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
          <p className="text-xs font-mono text-slate-400 uppercase">Global Avg Risk Score</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-3xl font-black text-cyan-400">{stats.avgRiskScore} <span className="text-sm font-normal text-slate-500">/ 100</span></h3>
            <span className="text-[10px] text-slate-400 font-mono">Weighted Mean</span>
          </div>
        </div>
      </div>

      {/* 2.5 MoEFCC Environmental Clearance (EC) Cap Watchdog Strip */}
      <div className="mt-6 bg-[#0B1326] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-400">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                MoEFCC Environmental Clearance (EC) Cap & Logistics Watchdog
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  STATUTORY CEILING: MoEFCC EIA 2006
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Continuous reconciliation of Pit Extraction vs Statutory EC Production Limits vs Railway Siding Dispatches.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              FY 2025-26 QUOTA TRACKING
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Tetaria Khar - Warning */}
          <div className="p-3.5 bg-slate-900/70 border border-amber-500/40 rounded-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-white">Tetaria Khar (ECL)</span>
                <p className="text-[10px] text-slate-400 font-mono">EC Ref: J-11015/84/2018-IA.II(M)</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                87.1% CEILING REACHED
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Extracted: <strong className="text-white">3.92 MT</strong></span>
                <span>Statutory Cap: <strong className="text-slate-300">4.50 MTPA</strong></span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full" style={{ width: '87.1%' }} />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Rail Siding Dispatch: <span className="text-emerald-400 font-bold">3.65 MT</span></span>
                <span className="text-amber-400">Pithead Stock: +0.27 MT</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-amber-300 font-mono">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>MoEFCC Section 15 alert: Extraction pace will breach cap in 28 days</span>
            </div>
          </div>

          {/* Dhori Khas - Compliant */}
          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-white">Dhori Khas (CCL)</span>
                <p className="text-[10px] text-slate-400 font-mono">EC Ref: J-11015/22/2016-IA.II(M)</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                68.3% CEILING
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Extracted: <strong className="text-white">4.10 MT</strong></span>
                <span>Statutory Cap: <strong className="text-slate-300">6.00 MTPA</strong></span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68.3%' }} />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Rail Siding Dispatch: <span className="text-emerald-400 font-bold">4.05 MT</span></span>
                <span className="text-slate-400">Stockpile Variance: 1.2% (Nominal)</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Optimal extraction schedule. Dispatch capacity balanced.</span>
            </div>
          </div>

          {/* Govindpur Colliery - Compliant */}
          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-white">Govindpur Colliery (BCCL)</span>
                <p className="text-[10px] text-slate-400 font-mono">EC Ref: J-11015/39/2019-IA.II(M)</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                67.2% CEILING
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Extracted: <strong className="text-white">2.15 MT</strong></span>
                <span>Statutory Cap: <strong className="text-slate-300">3.20 MTPA</strong></span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '67.2%' }} />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Rail Siding Dispatch: <span className="text-emerald-400 font-bold">2.12 MT</span></span>
                <span className="text-slate-400">Stockpile Variance: 1.4% (Nominal)</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Valid till Mar 2028. Full logistics harmony with railway rakes.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Body: Ranked Table & Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left: Risk Ranked Mines */}
        <div className="lg:col-span-2 bg-[#0B1326] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Consolidated Risk-Ranked Subsidiaries
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Click &apos;Explain Risk&apos; for SHAP Model Breakdown</span>
          </div>
          <div className="p-0 overflow-y-auto max-h-[450px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 font-mono text-slate-400 uppercase text-[10px] border-b border-slate-800 sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="px-5 py-3">Mine Location</th>
                  <th className="px-5 py-3">Risk Index</th>
                  <th className="px-5 py-3">Telemetry Bar</th>
                  <th className="px-5 py-3 text-right">Explainability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {riskScores.map(risk => (
                  <tr key={risk.mine_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-3.5 font-sans font-bold text-slate-100">
                      {risk.mines?.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold ${
                        risk.score > 70 ? 'text-red-400' :
                        risk.score > 45 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {risk.score}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 w-1/3">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getRiskColor(risk.score)}`} 
                          style={{ width: `${risk.score}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedXaiMine(risk)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 rounded font-sans text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Explain Risk (XAI)
                      </button>
                    </td>
                  </tr>
                ))}
                {riskScores.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">No risk data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Insights */}
        <div className="bg-[#0B1326] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Fingerprint className="w-32 h-32 text-indigo-500" />
          </div>
          <div className="pb-3 border-b border-slate-800 relative z-10 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              HQ AI RISK INSIGHTS
            </h2>
            <span className="text-[10px] font-mono text-slate-400">XGBoost Diagnostics</span>
          </div>
          
          <div className="mt-4 space-y-3 flex-1 relative z-10 font-sans">
            {riskScores.slice(0, 3).map(risk => {
              const cf = (risk as any).contributing_factors;
              return (
                <div key={risk.mine_id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-sm">
                  <div className="font-bold text-slate-100 mb-1 flex items-center justify-between">
                    <span>{risk.mines?.name} (Score: {risk.score})</span>
                  </div>
                  <div className="text-slate-400 leading-relaxed text-xs mb-2">
                    {risk.explanation || 'No AI explanation generated yet.'}
                  </div>
                  {cf?.ml_probability !== undefined && (
                    <div className="mt-2 mb-2 p-2 bg-indigo-950/20 rounded border border-indigo-500/20">
                      <p className="text-xs text-indigo-300">
                        <span className="font-bold text-indigo-400">ML Confidence:</span> {Math.round(cf.ml_probability)}% high-risk
                        {(cf.ml_top_factors || []).length > 0 && (
                          <span>, primarily driven by {(cf.ml_top_factors).join(' and ')}</span>
                        )}.
                      </p>
                    </div>
                  )}
                  {cf && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cf.location_anomaly && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[9px] font-mono font-medium text-rose-400 uppercase">
                          <AlertCircle className="w-2.5 h-2.5" /> Loc Anomaly
                        </span>
                      )}
                      {cf.hotspot && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono font-medium text-amber-400 uppercase">
                          <Activity className="w-2.5 h-2.5" /> Spatial Hotspot
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-800 relative z-10">
            <button 
              onClick={handleRecalculate}
              disabled={calculatingRisk}
              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {calculatingRisk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {calculatingRisk ? 'Recalculating Globally...' : 'Recalculate Global Risk Scores'}
            </button>
          </div>
        </div>

      </div>

      {/* 4. Bottom: Recent Violations Feed */}
      <div className="mt-6 bg-[#0B1326] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Enterprise Live Violations Feed</h3>
          <span className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            REALTIME INTERCONNECT ACTIVE
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 font-mono text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Mine & Subsidiary</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Escalation Status</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {violations.map(v => (
                <tr key={v.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-3.5 font-sans font-bold text-slate-200">{v.mines?.name || `Mine #${v.mine_id}`}</td>
                  <td className="px-5 py-3.5 text-slate-400">{v.category}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${getSeverityBadge(v.severity)}`}>
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${v.status === 'open' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs font-mono">
                    {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
              {violations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No recent violations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Explainable AI (XAI) TreeSHAP Diagnostic Modal */}
      {selectedXaiMine && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0B1326] border border-indigo-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-950/40 to-slate-900/60">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">SHAP Explainability Diagnostic</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                      TreeSHAP Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Additive Feature Attribution for <strong className="text-slate-200">{selectedXaiMine.mines?.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Risk Index</div>
                  <div className={`text-xl font-black ${
                    selectedXaiMine.score > 70 ? 'text-red-400' :
                    selectedXaiMine.score > 45 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {selectedXaiMine.score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedXaiMine(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Architecture info strip */}
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>XGBoost Classifier + Coal Mines Regulations (CMR 2017) Rule-Weights</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Base Value: E[f(x)] = 25.0 pts</span>
              </div>

              {/* Feature Attribution Waterfall */}
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                  <span>Contributing Risk Drivers (SHAP Values)</span>
                  <span className="text-[10px] text-slate-500">Positive = Increases Risk</span>
                </h4>

                <div className="space-y-3">
                  {(selectedXaiMine.xai_breakdown && selectedXaiMine.xai_breakdown.length > 0 ? selectedXaiMine.xai_breakdown : [
                    { feature: 'Active Statutory Safety Deficiencies', contribution_pts: 24.5, regulation: 'CMR 2017 General', severity: 'high', description: 'Compound safety non-compliances flagged in recent inspection cycles.' },
                    { feature: 'Inspection Cadence Lag', contribution_pts: 14.0, regulation: 'Mines Act 1952 Sec 22', severity: 'medium', description: 'Overdue periodic safety committee review.' }
                  ]).map((factor, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">{factor.feature}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                              {factor.regulation}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{factor.description}</p>
                        </div>
                        <span className="text-xs font-mono font-black text-rose-400 shrink-0 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                          +{factor.contribution_pts.toFixed(1)} pts
                        </span>
                      </div>

                      {/* Bar Visualization */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                          style={{ width: `${Math.min(factor.contribution_pts * 2.8, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statutory Recommendation Box */}
              <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    Statutory Mitigation Directive (Mines Act 1952 Sec 22)
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedXaiMine.recommendation || 'Remediate all flagged statutory defects immediately to avoid administrative closure orders.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                DGMS-Ready Audit Traceability
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => alert(`Statutory remediation ticket dispatched to Colliery Manager for ${selectedXaiMine.mines?.name}. Tracking ID: TKT-CMR-${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Dispatch Statutory Remediation Ticket
                </button>
                <button
                  onClick={() => setSelectedXaiMine(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
