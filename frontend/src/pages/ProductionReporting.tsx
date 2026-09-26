// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import {
  BarChart2, TrendingUp, TrendingDown, Plus, Download, Calendar,
  CheckCircle2, Loader2, AlertTriangle, Building2, Activity,
  Package, Truck, Pickaxe, Flame, Send, FileText, ChevronDown, ChevronUp,
  Shield, BarChart3, Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatISTShort } from '../lib/dateUtils';

// Real CIL mines from the actual Supabase database
const CIL_MINES = [
  'Gevra OCP','Govindpur Colliery','Moonidih Project','Rajhara','Bhubaneswari OCP',
  'Rajmahal OCP','Rohne','Choritand Tiliaya','Jogeshwar & Khas Jogeshwar','Rabodih OCP',
  'Urtan North','North of Arkhapal Srirampur','Dhori Khas','Sonepur Bazari OCP',
  'Jagannath OCP','Lingaraj OCP','Ib Valley OCP',
];

const MINE_TARGETS = {
  'Gevra OCP': 8500, 'Govindpur Colliery': 2500, 'Moonidih Project': 1800,
  'Rajhara': 3200, 'Bhubaneswari OCP': 6200, 'Rajmahal OCP': 4800, 'Rohne': 2200,
};

export default function ProductionReporting() {
  const { role } = useAuth();
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [mineFilter, setMineFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    report_date: today,
    mine_name: 'Gevra OCP',
    shift: 'A',
    coal_extracted_mt: '',
    overburden_removed_bcm: '',
    active_machines: '',
    workforce_deployed: '',
    blasts_conducted: '',
    safety_incidents: '0',
    target_mt: '',
    remarks: '',
    submitted_by: '',
  });

  // Auto-fill target when mine changes
  const handleMineChange = (mineName) => {
    const defaultTarget = MINE_TARGETS[mineName];
    setForm(f => ({ ...f, mine_name: mineName, target_mt: defaultTarget ? String(Math.round(defaultTarget / 3)) : f.target_mt }));
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('production_reports').select('*').order('report_date', { ascending: false }).order('created_at', { ascending: false });
      if (mineFilter !== 'all') query = query.eq('mine_name', mineFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(dateFilter));
      query = query.gte('report_date', cutoff.toISOString().slice(0, 10));
      const { data, error } = await query;
      if (!error && data && data.length > 0) setRecords(data);
      else if (error) console.warn('Production fetch error:', error.message);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [mineFilter, dateFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        coal_extracted_mt: parseFloat(form.coal_extracted_mt),
        overburden_removed_bcm: parseFloat(form.overburden_removed_bcm),
        active_machines: parseInt(form.active_machines),
        workforce_deployed: parseInt(form.workforce_deployed),
        blasts_conducted: parseInt(form.blasts_conducted),
        safety_incidents: parseInt(form.safety_incidents),
        target_mt: parseFloat(form.target_mt),
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      await supabase.from('production_reports').insert([payload]);
      setRecords(prev => [{ ...payload, id: Date.now() }, ...prev]);

      // Fire notification if below target
      const pct = (payload.coal_extracted_mt / payload.target_mt) * 100;
      if (pct < 90) {
        window.dispatchEvent(new CustomEvent('coalguard:newAlert', {
          detail: {
            id: `prod-${Date.now()}`,
            type: 'compliance',
            severity: pct < 70 ? 'high' : 'medium',
            title: 'PRODUCTION BELOW TARGET',
            message: `${payload.mine_name} ${payload.shift}-Shift: ${payload.coal_extracted_mt}MT extracted (${pct.toFixed(1)}% of ${payload.target_mt}MT target)`,
            destination: '/production-reports',
            created_at: new Date().toISOString(),
          }
        }));
      }

      setSubmitSuccess(true);
      setShowForm(false);
      setForm({ report_date: today, mine_name: 'Govindpur Colliery', shift: 'A', coal_extracted_mt: '', overburden_removed_bcm: '', active_machines: '', workforce_deployed: '', blasts_conducted: '', safety_incidents: '0', target_mt: '', remarks: '', submitted_by: '' });
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    try { await supabase.from('production_reports').update({ status: 'approved' }).eq('id', id); } catch (e) {}
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DAILY PRODUCTION REPORT — COAL INDIA LIMITED', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`DGMS Statutory Production Log | Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [['Date', 'Mine', 'Shift', 'Coal Extracted (MT)', 'Target (MT)', '% Achieved', 'OB Removed (BCM)', 'Machines', 'Workforce', 'Blasts', 'Incidents', 'Status']],
      body: records.map(r => [
        r.report_date, r.mine_name, r.shift,
        r.coal_extracted_mt?.toLocaleString(),
        r.target_mt?.toLocaleString(),
        r.target_mt ? `${((r.coal_extracted_mt / r.target_mt) * 100).toFixed(1)}%` : '-',
        r.overburden_removed_bcm?.toLocaleString(),
        r.active_machines, r.workforce_deployed, r.blasts_conducted,
        r.safety_incidents, r.status?.toUpperCase()
      ]),
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save(`Production_Report_${Date.now()}.pdf`);
  };

  // Trend: group by date, sum extraction for chart
  const last7Dates = Array.from({length:7}, (_,i) => { const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10); }).reverse();
  const trendData = last7Dates.map(date => ({
    date,
    extracted: records.filter(r=>r.report_date===date).reduce((s,r)=>s+(parseFloat(r.coal_extracted_mt)||0),0),
    target: records.filter(r=>r.report_date===date).reduce((s,r)=>s+(parseFloat(r.target_mt)||0),0),
  }));
  const maxVal = Math.max(...trendData.map(d => Math.max(d.extracted, d.target)), 1);
  const chartMax = maxVal * 1.2; // 20% headroom

  const totalMT = records.reduce((s, r) => s + (parseFloat(r.coal_extracted_mt) || 0), 0);
  const totalTarget = records.reduce((s, r) => s + (parseFloat(r.target_mt) || 0), 0);
  const avgAchievement = totalTarget > 0 ? (totalMT / totalTarget) * 100 : 0;
  const totalIncidents = records.reduce((s, r) => s + (r.safety_incidents || 0), 0);
  const totalWorkforce = records.reduce((s, r) => s + (r.workforce_deployed || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Pickaxe className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Production Reporting</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Daily coal extraction, OB removal, workforce & machine utilisation — DGMS statutory returns</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition-all">
            <Plus className="w-4 h-4" /> Submit Report
          </button>
        </div>
      </div>

      {submitSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Production report submitted successfully and forwarded for corporate approval.</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-xl font-black text-amber-700 dark:text-amber-400">{totalMT >= 1000 ? `${(totalMT/1000).toFixed(1)}K` : totalMT.toFixed(0)} MT</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Coal Extracted</p>
        </div>
        <div className={`p-4 rounded-xl border ${avgAchievement >= 90 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20'}`}>
          <p className={`text-xl font-black ${avgAchievement >= 90 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>{avgAchievement.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Target Achievement</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <p className="text-xl font-black text-blue-700 dark:text-blue-400">{records.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Reports Filed</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-white/10">
          <p className="text-xl font-black text-slate-700 dark:text-slate-300">{totalWorkforce >= 1000 ? `${(totalWorkforce/1000).toFixed(1)}K` : totalWorkforce}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Workforce</p>
        </div>
        <div className={`p-4 rounded-xl border ${totalIncidents === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'}`}>
          <p className={`text-xl font-black ${totalIncidents === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{totalIncidents}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Safety Incidents</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={mineFilter} onChange={e => setMineFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500">
          <option value="all">All Mines</option>
          {CIL_MINES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500">
          <option value="7">Last 7 Days</option>
          <option value="14">Last 14 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
        {loading && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Loading...</span>}
      </div>

      {/* 7-Day Production Trend Chart */}
      {trendData.some(d => d.extracted > 0) && (
        <div className="p-5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">7-Day Production Trend</h3>
            <span className="text-xs text-slate-400 ml-auto">Coal Extracted (MT) vs Target</span>
          </div>
          <div className="flex items-end gap-2 h-28">
            {trendData.map(d => {
              const heightPct = chartMax > 0 ? (d.extracted / chartMax) * 100 : 0;
              const targetPct = chartMax > 0 ? (d.target / chartMax) * 100 : 0;
              const onTarget = d.target > 0 && d.extracted >= d.target * 0.9;
              const dayLabel = new Date(d.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative flex items-end" style={{height:'80px'}}>
                    {d.target > 0 && <div className="absolute inset-x-0 border-t-2 border-dashed border-slate-300 dark:border-slate-600 opacity-60" style={{bottom:`${targetPct}%`}} title={`Target: ${d.target.toLocaleString()} MT`} />}
                    <div
                      className={`w-full rounded-t-md transition-all ${d.extracted === 0 ? 'bg-slate-200 dark:bg-slate-700/50' : onTarget ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500 dark:bg-amber-400'}`}
                      style={{height: d.extracted === 0 ? '4px' : `${heightPct}%`}}
                      title={`${d.date}: ${d.extracted.toLocaleString()} MT`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 text-center">{dayLabel}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block"/>On/above target</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block"/>Below target</span>
            <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-slate-400 inline-block"/>Daily target</span>
          </div>
        </div>
      )}

      {/* Records List */}
      <div className="space-y-3">
        {records.map(r => {
          const pct = r.target_mt ? ((r.coal_extracted_mt / r.target_mt) * 100) : 0;
          const onTarget = pct >= 90;
          const isExpanded = expandedId === r.id;
          return (
            <div key={r.id} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${onTarget ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-red-100 dark:bg-red-500/10'}`}>
                    {onTarget ? <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{r.mine_name}</span>
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-slate-500 dark:text-slate-400">{r.shift}-Shift</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{r.report_date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span><strong className="text-slate-700 dark:text-slate-300">{r.coal_extracted_mt?.toLocaleString()} MT</strong> coal extracted</span>
                      <span>·</span>
                      <span className={`font-bold ${onTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{pct.toFixed(1)}% of target</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${r.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'}`}>
                    {r.status === 'approved' ? '✓ APPROVED' : '⏳ PENDING'}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-white/5 p-4 bg-slate-50 dark:bg-white/[0.01]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Coal Extracted', value: `${r.coal_extracted_mt?.toLocaleString()} MT`, icon: Pickaxe },
                      { label: 'OB Removed', value: `${r.overburden_removed_bcm?.toLocaleString()} BCM`, icon: Truck },
                      { label: 'Active Machines', value: r.active_machines, icon: Activity },
                      { label: 'Workforce', value: r.workforce_deployed, icon: Building2 },
                      { label: 'Blasts Conducted', value: r.blasts_conducted, icon: Flame },
                      { label: 'Safety Incidents', value: r.safety_incidents, icon: AlertTriangle },
                      { label: 'Target (MT)', value: `${r.target_mt?.toLocaleString()} MT`, icon: BarChart2 },
                      { label: 'Submitted By', value: r.submitted_by || '—', icon: FileText },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                          <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 text-slate-400" /><span className="text-[10px] text-slate-500 dark:text-slate-400">{item.label}</span></div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>
                  {r.remarks && <p className="text-xs text-slate-600 dark:text-slate-400 italic mb-3">"{r.remarks}"</p>}
                  {role === 'corporate' && r.status === 'pending' && (
                    <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition-all">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Report
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Pickaxe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="font-bold text-slate-900 dark:text-white">Submit Daily Production Report</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Report Date</label>
                  <input type="date" required value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Mine Name</label>
                  <select value={form.mine_name} onChange={e => handleMineChange(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500">
                    {CIL_MINES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Shift</label>
                  <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500">
                    <option value="A">A-Shift (06:00–14:00)</option>
                    <option value="B">B-Shift (14:00–22:00)</option>
                    <option value="C">C-Shift (22:00–06:00)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Target (MT)</label>
                  <input type="number" required min="0" value={form.target_mt} onChange={e => setForm(f => ({ ...f, target_mt: e.target.value }))} placeholder="e.g. 2500" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Coal Extracted (MT) *</label>
                  <input type="number" required min="0" value={form.coal_extracted_mt} onChange={e => setForm(f => ({ ...f, coal_extracted_mt: e.target.value }))} placeholder="e.g. 2340" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">OB Removed (BCM)</label>
                  <input type="number" min="0" value={form.overburden_removed_bcm} onChange={e => setForm(f => ({ ...f, overburden_removed_bcm: e.target.value }))} placeholder="e.g. 8900" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Active Machines</label>
                  <input type="number" min="0" value={form.active_machines} onChange={e => setForm(f => ({ ...f, active_machines: e.target.value }))} placeholder="e.g. 12" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Workforce Deployed</label>
                  <input type="number" min="0" value={form.workforce_deployed} onChange={e => setForm(f => ({ ...f, workforce_deployed: e.target.value }))} placeholder="e.g. 284" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Blasts Conducted</label>
                  <input type="number" min="0" value={form.blasts_conducted} onChange={e => setForm(f => ({ ...f, blasts_conducted: e.target.value }))} placeholder="e.g. 3" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Safety Incidents</label>
                  <input type="number" min="0" value={form.safety_incidents} onChange={e => setForm(f => ({ ...f, safety_incidents: e.target.value }))} placeholder="0" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Submitting Officer Name</label>
                <input value={form.submitted_by} onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))} placeholder="Full name and designation..." className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Remarks / Observations</label>
                <textarea rows={3} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Any operational notes, delays, or special observations..." className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none" />
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/20 transition-all disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
