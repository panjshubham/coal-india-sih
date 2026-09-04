import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, AlertTriangle, Activity, AlertCircle, RefreshCw, BarChart2, BellRing } from 'lucide-react';
import { formatDistanceToNow, subDays } from 'date-fns';

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

interface Alert {
  id: number;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
  type: string;
}

export default function RegulatorDashboard() {
  const [stats, setStats] = useState({
    totalMines: 0,
    activeViolations: 0,
    overdueCompliance: 0,
    avgRiskScore: 0
  });

  const [riskScores, setRiskScores] = useState<MineRisk[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [escalations, setEscalations] = useState<Alert[]>([]);
  const [calculatingRisk, setCalculatingRisk] = useState(false);

  useEffect(() => {
    fetchInitialData();

    // Realtime subscription for violations
    const channel = supabase.channel('regulator-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'violations' }, payload => {
        fetchSingleViolation(payload.new.id);
        setStats(s => ({ ...s, activeViolations: s.activeViolations + 1 }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        // Simple re-fetch of escalations on any new alert
        fetchEscalations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchEscalations() {
    try {
      const threeDaysAgo = subDays(new Date(), 3).toISOString();
      
      // We want: severity = 'high' OR (is_read = false AND created_at < 3 days ago)
      // Supabase's OR syntax:
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .or(`severity.eq.high,and(is_read.eq.false,created_at.lt.${threeDaysAgo})`)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (!error && data) {
        setEscalations(data as Alert[]);
      }
    } catch (err) {
      console.error(err);
    }
  }

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
          mine_id, score, explanation, last_updated,
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
      
      // 4. Escalations
      await fetchEscalations();

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

  const getRiskColor = (score: number) => {
    if (score > 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getSeverityBadge = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">Regulator Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Read-only oversight of all subsidiary operations and statutory escalations.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-100 border border-slate-300">
          <ShieldAlert className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold tracking-widest text-slate-700 uppercase">Read Only Access</span>
        </div>
      </div>

      {/* Escalations Panel */}
      {escalations.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500/30 rounded shadow-sm flex flex-col mb-8 relative overflow-hidden">
          <div className="p-4 border-b border-red-500/20 bg-red-100 flex items-center gap-3">
            <BellRing className="w-5 h-5 text-red-600 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-900">Critical Escalations</h3>
          </div>
          <div className="divide-y divide-red-200/50">
            {escalations.map(esc => (
              <div key={esc.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700">{esc.type}</span>
                    {!esc.is_read && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  <p className="text-sm font-medium text-red-950">{esc.message}</p>
                </div>
                <span className="text-xs font-medium text-red-800">
                  {formatDistanceToNow(new Date(esc.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Mines</span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-3xl font-serif font-bold text-slate-900">{stats.totalMines}</span>
        </div>

        <div className="bg-white rounded border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Violations</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-3xl font-serif font-bold text-slate-900">{stats.activeViolations}</span>
        </div>

        <div className="bg-white rounded border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Compliance</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <span className="text-3xl font-serif font-bold text-slate-900">{stats.overdueCompliance}</span>
        </div>

        <div className="bg-white rounded border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Risk Score</span>
            <BarChart2 className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-slate-900">{stats.avgRiskScore}</span>
            <span className="text-sm font-medium text-slate-500">/ 100</span>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Risk Ranked Mines */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Risk-Ranked Subsidiaries</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 font-medium">Mine</th>
                  <th className="px-5 py-3 font-medium">Risk Score</th>
                  <th className="px-5 py-3 font-medium">Telemetry Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskScores.map(risk => (
                  <tr key={risk.mine_id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{risk.mines?.name}</td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-medium text-slate-700">{risk.score}</span>
                    </td>
                    <td className="px-5 py-3 w-1/2">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
        <div className="bg-[#FFFBEB] border-2 border-amber-500/50 rounded shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert className="w-24 h-24 text-amber-700" />
          </div>
          <div className="p-5 border-b border-amber-500/20 relative z-10 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900">AI Risk Insights</h3>
          </div>
          <div className="p-5 space-y-4 flex-1 relative z-10">
            {riskScores.slice(0, 3).map(risk => (
              <div key={risk.mine_id} className="p-3 bg-white/60 rounded border border-amber-500/20 text-sm">
                <div className="font-bold text-amber-900 mb-1">{risk.mines?.name} (Score: {risk.score})</div>
                <div className="text-amber-800/80 leading-relaxed text-xs">{risk.explanation || 'No AI explanation generated yet.'}</div>
              </div>
            ))}
            {riskScores.length === 0 && (
              <p className="text-sm text-amber-800">Insufficient data for AI insights.</p>
            )}
          </div>
          <div className="p-4 border-t border-amber-500/20 bg-amber-500/5 relative z-10">
            <button 
              onClick={async () => {
                setCalculatingRisk(true);
                try {
                  const res = await fetch(`${import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000'}/analyze/all`, { method: 'POST' });
                  if (!res.ok) throw new Error('AI Service request failed');
                  await fetchInitialData();
                } catch (err) {
                  console.error(err);
                  alert('Failed to recalculate risk scores. Is the AI Service running?');
                } finally {
                  setCalculatingRisk(false);
                }
              }}
              disabled={calculatingRisk}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-sm font-bold rounded transition-colors disabled:opacity-70"
            >
              {calculatingRisk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {calculatingRisk ? 'Recalculating...' : 'Recalculate Risk Scores'}
            </button>
          </div>
        </div>

      </div>

      {/* Bottom: Recent Violations Feed */}
      <div className="bg-white border border-slate-200 rounded shadow-sm flex flex-col mt-8">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Live Violations Feed</h3>
          <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            REALTIME ACTIVE
          </span>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Mine</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {violations.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-900">{v.mines?.name || `Mine #${v.mine_id}`}</td>
                  <td className="px-5 py-3 text-slate-600">{v.category}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${getSeverityBadge(v.severity)}`}>
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${v.status === 'open' ? 'text-amber-700 bg-amber-100' : 'text-slate-600 bg-slate-100'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
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
