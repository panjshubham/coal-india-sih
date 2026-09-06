import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, AlertTriangle, Activity, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
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
        // Fetch the full violation with mine name to append to the list
        fetchSingleViolation(payload.new.id);
        
        // Update stats
        setStats(s => ({ ...s, activeViolations: s.activeViolations + 1 }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'violations' }, () => {
        fetchInitialData(); // Re-fetch to keep it simple and accurate
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

      const risks = (riskData || []) as unknown as MineRisk[];
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
      if (!res.ok) throw new Error('AI Service request failed');
      
      // Refresh the local data to reflect new scores and AI insights
      await fetchInitialData();
    } catch (err) {
      console.error(err);
      alert('Failed to recalculate risk scores. Is the AI Service running?');
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">Corporate Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise-wide telemetric and statutory oversight.</p>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Mines</span>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-3xl font-serif font-bold text-white">{stats.totalMines}</span>
        </div>

        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-amber-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Violations</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-3xl font-serif font-bold text-white">{stats.activeViolations}</span>
        </div>

        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-red-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Compliance</span>
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <span className="text-3xl font-serif font-bold text-white">{stats.overdueCompliance}</span>
        </div>

        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-indigo-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Risk Score</span>
            <BarChart2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">{stats.avgRiskScore}</span>
            <span className="text-sm font-medium text-slate-500">/ 100</span>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Risk Ranked Mines */}
        <div className="lg:col-span-2 bg-[#121A2F]/80 backdrop-blur-md border border-white/10 rounded shadow-sm flex flex-col">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Risk-Ranked Subsidiaries</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/20 text-xs text-slate-400 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-5 py-3 font-medium">Mine</th>
                  <th className="px-5 py-3 font-medium">Risk Score</th>
                  <th className="px-5 py-3 font-medium">Telemetry Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {riskScores.map(risk => (
                  <tr key={risk.mine_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-200">{risk.mines?.name}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-medium text-slate-300">{risk.score}</span>
                    </td>
                    <td className="px-5 py-3 w-1/2">
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
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
        <div className="bg-amber-500/5 backdrop-blur-md border border-amber-500/20 rounded shadow-sm flex flex-col relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldAlert className="w-24 h-24 text-amber-500" />
          </div>
          <div className="p-5 border-b border-amber-500/10 relative z-10 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">AI Risk Insights</h3>
          </div>
          <div className="p-5 space-y-4 flex-1 relative z-10">
            {riskScores.slice(0, 3).map(risk => (
              <div key={risk.mine_id} className="p-3 bg-black/40 rounded border border-amber-500/20 text-sm">
                <div className="font-bold text-amber-400 mb-1 flex items-center justify-between">
                  <span>{risk.mines?.name} (Score: {risk.score})</span>
                </div>
                <div className="text-amber-200/70 leading-relaxed text-xs mb-2">{risk.explanation || 'No AI explanation generated yet.'}</div>
                {(risk as any).contributing_factors?.ml_probability !== undefined && (
                  <div className="mt-2 mb-2 p-2 bg-[#060913]/60 rounded border border-indigo-500/30">
                    <p className="text-xs text-indigo-300">
                      <span className="font-bold text-indigo-400">ML model confidence:</span> {Math.round((risk as any).contributing_factors.ml_probability)}% high-risk
                      {((risk as any).contributing_factors.ml_top_factors || []).length > 0 && (
                        <span>, driven primarily by {((risk as any).contributing_factors.ml_top_factors).join(' and ')}</span>
                      )}.
                    </p>
                  </div>
                )}
                {(risk as any).contributing_factors && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(risk as any).contributing_factors.location_anomaly && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] font-mono font-medium text-rose-400 uppercase tracking-wider">
                        <AlertCircle className="w-2.5 h-2.5" /> Loc Anomaly
                      </span>
                    )}
                    {(risk as any).contributing_factors.hotspot && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[9px] font-mono font-medium text-amber-400 uppercase tracking-wider">
                        <Activity className="w-2.5 h-2.5" /> Spatial Hotspot
                      </span>
                    )}
                    {(risk as any).contributing_factors.time_pattern && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[9px] font-mono font-medium text-blue-400 uppercase tracking-wider">
                        <RefreshCw className="w-2.5 h-2.5" /> {(risk as any).contributing_factors.time_pattern}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {riskScores.length === 0 && (
              <p className="text-sm text-amber-500/70">Insufficient data for AI insights.</p>
            )}
          </div>
          <div className="p-4 border-t border-amber-500/10 bg-black/20 relative z-10">
            <button 
              onClick={handleRecalculate}
              disabled={calculatingRisk}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-sm font-bold rounded transition-colors disabled:opacity-50"
            >
              {calculatingRisk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {calculatingRisk ? 'Recalculating...' : 'Recalculate Risk Scores'}
            </button>
          </div>
        </div>

      </div>

      {/* Bottom: Recent Violations Feed */}
      <div className="bg-[#121A2F]/80 backdrop-blur-md border border-white/10 rounded shadow-sm flex flex-col">
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Violations Feed</h3>
          <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            REALTIME ACTIVE
          </span>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Mine</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {violations.map(v => (
                <tr key={v.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-200">{v.mines?.name || `Mine #${v.mine_id}`}</td>
                  <td className="px-5 py-3 text-slate-400">{v.category}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${getSeverityBadge(v.severity)}`}>
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] border font-bold uppercase tracking-wider ${v.status === 'open' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs font-mono">
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
