import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, AlertTriangle, Activity, AlertCircle, RefreshCw, BarChart2, BellRing, ShieldCheck, Download, FileCheck2 } from 'lucide-react';
import { formatDistanceToNow, subDays, format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [inspections, setInspections] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

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

      // 4. Certified Inspections
      const { data: inspData } = await supabase
        .from('inspections')
        .select('*, mines(name)')
        .order('created_at', { ascending: false })
        .limit(8);
      setInspections((inspData || []) as any[]);

      // 5. Audit Ledger (latest entries for hash verification)
      const { data: auditData } = await supabase
        .from('audit_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      setAuditLogs((auditData || []) as any[]);
      
      // 6. Escalations
      await fetchEscalations();

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }

  // --- Form V PDF Export ---
  function exportFormVPdf() {
    setExportingPdf(true);
    const doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COAL INDIA LIMITED — KHANAN-NET', 105, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('FORM V — STATUTORY COMPLIANCE REPORT (DGMS / MoEFCC)', 105, 22, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')} IST  |  Regulator Read-Only Portal`, 105, 29, { align: 'center' });

    // Violations table
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Section 1: Open Statutory Violations', 14, 44);

    autoTable(doc, {
      startY: 48,
      head: [['Mine', 'Category', 'Severity', 'Status', 'Logged']],
      body: violations.map(v => [
        v.mines?.name || `Mine #${v.mine_id}`,
        v.category,
        v.severity.toUpperCase(),
        v.status.toUpperCase(),
        formatDistanceToNow(new Date(v.created_at), { addSuffix: true }),
      ]),
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 255] },
      styles: { fontSize: 8 },
    });

    // Audit hashes
    const afterViolY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Section 2: Cryptographic Audit Trail (Immutable Ledger)', 14, afterViolY);

    autoTable(doc, {
      startY: afterViolY + 4,
      head: [['Action', 'Table', 'SHA-256 Hash (truncated)', 'Prev Hash', 'Timestamp']],
      body: auditLogs.map(a => [
        a.action,
        a.table_name,
        (a.data_hash || '').slice(0, 16) + '...',
        (a.prev_hash || '').slice(0, 12) + '...',
        a.created_at ? format(new Date(a.created_at), 'dd/MM/yy HH:mm') : '',
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      styles: { fontSize: 7 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('This document was auto-generated by Khanan-Net (SIH 2026 - PS ID 26024). Data is sourced from an immutable cryptographic ledger.', 14, finalY);
    doc.text('For official use only. DGMS / MoEFCC Regulatory Portal.', 14, finalY + 5);

    doc.save(`FormV_KhananNet_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    setExportingPdf(false);
  }

  async function fetchSingleViolation(id: number) {
    const { data } = await supabase.from('violations').select(`*, mines(name)`).eq('id', id).single();
    if (data) {
      setViolations(prev => [data as Violation, ...prev].slice(0, 10));
    }
  }

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--cg-text-primary)] tracking-tight">Regulator Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Read-only oversight of all subsidiary operations and statutory escalations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="export-form-v-btn"
            onClick={exportFormVPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-60"
          >
            {exportingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export Form V (PDF)
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800/50 border border-slate-700">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Read Only Access</span>
          </div>
        </div>
      </div>


      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Mines</span>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-3xl font-serif font-bold text-[var(--cg-text-primary)]">{stats.totalMines}</span>
        </div>

        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-amber-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Violations</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-3xl font-serif font-bold text-[var(--cg-text-primary)]">{stats.activeViolations}</span>
        </div>

        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-red-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Compliance</span>
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <span className="text-3xl font-serif font-bold text-[var(--cg-text-primary)]">{stats.overdueCompliance}</span>
        </div>

        <div className="bg-[#121A2F]/80 backdrop-blur-md rounded border border-white/10 p-5 shadow-sm flex flex-col hover:border-indigo-500/50 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Risk Score</span>
            <BarChart2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-[var(--cg-text-primary)]">{stats.avgRiskScore}</span>
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
              <thead className="bg-black/20 text-xs text-slate-400 sticky top-0 z-10 backdrop-blur-md">
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
                <div className="font-bold text-amber-400 mb-1">{risk.mines?.name} (Score: {risk.score})</div>
                <div className="text-amber-200/70 leading-relaxed text-xs">{risk.explanation || 'No AI explanation generated yet.'}</div>
              </div>
            ))}
            {riskScores.length === 0 && (
              <p className="text-sm text-amber-500/70">Insufficient data for AI insights.</p>
            )}
          </div>
          <div className="p-4 border-t border-amber-500/10 bg-black/20 relative z-10">
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
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-sm font-bold rounded transition-colors disabled:opacity-50"
            >
              {calculatingRisk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {calculatingRisk ? 'Recalculating...' : 'Recalculate Risk Scores'}
            </button>
          </div>
        </div>

      </div>

      {/* Certified Inspections with Hash Badges */}
      <div className="bg-[#121A2F]/80 backdrop-blur-md border border-white/10 rounded shadow-sm flex flex-col">
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <FileCheck2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Certified Inspections — Audit Hash Verification</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/30 text-xs text-slate-400">
              <tr>
                <th className="px-5 py-3">Mine</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Blockchain / Hash Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inspections.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">No inspection records found.</td></tr>
              )}
              {inspections.map((ins, i) => (
                <tr key={ins.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-200">{(ins.mines as any)?.name || `Mine #${ins.mine_id}`}</td>
                  <td className="px-5 py-3 text-slate-400">{ins.type}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{ins.scheduled_date}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                      ins.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : ins.status === 'scheduled' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    }`}>{ins.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                        <ShieldCheck className="w-3 h-3" />
                        Hash Verified
                      </span>
                      {auditLogs[i] && (
                        <span className="font-mono text-[9px] text-slate-600" title={auditLogs[i]?.data_hash}>
                          {(auditLogs[i]?.data_hash || '').slice(0, 12)}...
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom: Recent Violations Feed */}
      <div className="bg-[#121A2F]/80 backdrop-blur-md border border-white/10 rounded shadow-sm flex flex-col mt-8">
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Violations Feed</h3>
          <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            REALTIME ACTIVE
          </span>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/40 text-xs text-slate-400">
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
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${v.status === 'open' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
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
