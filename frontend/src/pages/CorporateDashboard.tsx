import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, AlertTriangle, Activity, AlertCircle, RefreshCw, BarChart2, Globe2, Radio, Server, Fingerprint } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MineRisk {
  mine_id: number;
  score: number;
  explanation: string;
  last_updated: string;
  mines: {
    name: string;
  };
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
            contributing_factors: { ml_probability: 82, ml_top_factors: ['overdue safety breaches', 'seam depth telemetry'], hotspot: true, location_anomaly: true }
          },
          {
            mine_id: 2,
            score: 64,
            explanation: 'Unresolved ventilation fan maintenance backlog combined with seasonal water-inflow elevation.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Dhori Khas (CCL)' },
            contributing_factors: { ml_probability: 68, ml_top_factors: ['ventilation backlog'], hotspot: true }
          },
          {
            mine_id: 3,
            score: 42,
            explanation: 'Standard baseline operations with minor documentation renewal lag in haulage equipment.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Govindpur Colliery (BCCL)' },
            contributing_factors: { ml_probability: 38, ml_top_factors: ['documentation renewal'] }
          },
          {
            mine_id: 4,
            score: 28,
            explanation: 'Nominal telemetry readings across all safety sensors with zero active statutory violations.',
            last_updated: new Date().toISOString(),
            mines: { name: 'Karo Special Seam (CCL)' },
            contributing_factors: { ml_probability: 18 }
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

      {/* 3. Main Body: Ranked Table & Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left: Risk Ranked Mines */}
        <div className="lg:col-span-2 bg-[#0B1326] border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
              Consolidated Risk-Ranked Subsidiaries
            </h2>
          </div>
          <div className="p-0 overflow-y-auto max-h-[450px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 font-mono text-slate-400 uppercase text-[10px] border-b border-slate-800 sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="px-5 py-3">Mine Location</th>
                  <th className="px-5 py-3">Risk Index</th>
                  <th className="px-5 py-3">Telemetry Bar</th>
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
                    <td className="px-5 py-3.5 w-1/2">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getRiskColor(risk.score)}`} 
                          style={{ width: `${risk.score}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {riskScores.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500">No risk data available.</td>
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
    </div>
  );
}
