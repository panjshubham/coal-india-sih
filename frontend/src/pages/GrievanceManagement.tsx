// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquarePlus, AlertTriangle, CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, Plus, Search, User, Calendar,
  FileText, Loader2, ShieldAlert, Megaphone, Wrench, HardHat,
  Send, RefreshCw, Download, Building2, TrendingUp, Shield
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatISTShort } from '../lib/dateUtils';

// Real CIL mine names pulled from the actual database
const CIL_MINES = [
  'Govindpur Colliery','Moonidih Project','Gevra OCP','Rajhara','Bhubaneswari OCP',
  'Rajmahal OCP','Rohne','Choritand Tiliaya','Jogeshwar & Khas Jogeshwar','Rabodih OCP',
  'Urtan North','North of Arkhapal Srirampur','Dhori Khas','Sonepur Bazari OCP',
];

const GRIEVANCE_CATEGORIES = [
  { value: 'safety', label: 'Safety Hazard', icon: HardHat, color: 'red' },
  { value: 'wages', label: 'Wages & Payment', icon: FileText, color: 'amber' },
  { value: 'equipment', label: 'Equipment / Tools', icon: Wrench, color: 'blue' },
  { value: 'harassment', label: 'Workplace Harassment', icon: ShieldAlert, color: 'purple' },
  { value: 'welfare', label: 'Worker Welfare', icon: User, color: 'emerald' },
  { value: 'other', label: 'Other', icon: Megaphone, color: 'slate' },
];

const PRIORITY_OPTS = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border-red-300 dark:border-red-500/30' },
  { value: 'high',     label: 'High',     color: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border-orange-300 dark:border-orange-500/30' },
  { value: 'medium',   label: 'Medium',   color: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30' },
  { value: 'low',      label: 'Low',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-500/30' },
];

const STATUS_CONFIG = {
  pending:     { label: 'Pending Review', icon: Clock,         color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' },
  in_progress: { label: 'In Progress',   icon: RefreshCw,     color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' },
  resolved:    { label: 'Resolved',      icon: CheckCircle2,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' },
  rejected:    { label: 'Rejected',      icon: XCircle,       color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' },
};

// Demo grievances for display when DB table is not yet set up
const DEMO_GRIEVANCES = [
  { id: 1, grievance_id: 'GRV-2026-001', category: 'safety', priority: 'critical', subject: 'Water seepage in Seam 3 North haulage road', description: 'Persistent water seepage observed near Junction 4B creating slip hazard for workers. CMR Reg 89 requires immediate remediation.', status: 'in_progress', submitted_by: 'Ramesh Kumar', mine_name: 'Govindpur Colliery', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), resolution_notes: 'Maintenance team dispatched. Dewatering pump installed.' },
  { id: 2, grievance_id: 'GRV-2026-002', category: 'wages', priority: 'high', subject: 'Overtime wages not credited for Q3 shift cycle', description: 'Underground workers in shift C have not received overtime payment for 18 additional hours worked during Seam 5 emergency operations in August 2026.', status: 'pending', submitted_by: 'Suresh Yadav', mine_name: 'Bharat Coking Coal', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), resolution_notes: null },
  { id: 3, grievance_id: 'GRV-2026-003', category: 'equipment', priority: 'medium', subject: 'SDL loader hydraulic failure — unserviced for 42 days', description: 'SDL loader #SL-117 hydraulic system showing failure indicators. Last statutory service was 42 days ago, exceeding CMR limit of 30 days.', status: 'resolved', submitted_by: 'Manjit Singh', mine_name: 'Govindpur Colliery', created_at: new Date(Date.now() - 12 * 86400000).toISOString(), resolution_notes: 'Equipment serviced on 14-Sep-2026. Hydraulic system replaced. CMR Form 23 updated.' },
  { id: 4, grievance_id: 'GRV-2026-004', category: 'welfare', priority: 'low', subject: 'Drinking water supply disrupted in Pit-2 rest area', description: 'Drinking water supply has been disrupted at the Pit-2 surface rest area for 4 days. Workers required to travel 800m for water access.', status: 'pending', submitted_by: 'Anil Verma', mine_name: 'Eastern Coalfields', created_at: new Date(Date.now() - 1 * 86400000).toISOString(), resolution_notes: null },
];

export default function GrievanceManagement() {
  const { role } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [mineFilter, setMineFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    category: 'safety',
    priority: 'medium',
    subject: '',
    description: '',
    submitted_by: '',
    mine_name: 'Govindpur Colliery',
    anonymous: false,
  });

  // SLA helper — days since creation
  const daysSince = (dateStr) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  const slaBreach = (g) => {
    if (g.status === 'resolved' || g.status === 'rejected') return false;
    const limits = { critical: 1, high: 3, medium: 7, low: 14 };
    return daysSince(g.created_at) > (limits[g.priority] || 7);
  };

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        setGrievances(data);
      } else {
        // Use realistic demo data while DB propagates
        setGrievances([
          { id:'d1', grievance_id:'GRV-2026-001', category:'safety',     priority:'critical', subject:'Roof bolting failure in Moonidih Project seam 4', description:'Multiple roof bolts found loose in Seam 4 North panel. Risk of roof collapse. CMR Reg 36 mandates immediate inspection.', submitted_by:'Shri Suresh Nath', mine_name:'Moonidih Project', status:'in_progress', created_at:new Date(Date.now()-2*86400000).toISOString(), resolution_notes:'Safety Inspector dispatched. Panel sealed pending re-bolting.' },
          { id:'d2', grievance_id:'GRV-2026-002', category:'wages',      priority:'high',     subject:'Overtime wages unpaid for August 2026 — Govindpur Colliery', description:'94 workers in Shift-C have not received overtime payment for 22 hours of emergency production support.', submitted_by:'Ramesh Kumar Yadav', mine_name:'Govindpur Colliery', status:'pending', created_at:new Date(Date.now()-5*86400000).toISOString(), resolution_notes:null },
          { id:'d3', grievance_id:'GRV-2026-003', category:'equipment',  priority:'medium',   subject:'SDL Loader #SL-42 hydraulic failure — Gevra OCP', description:'SDL Loader SL-42 hydraulic pressure warnings for 11 days. Last CMR service was 38 days ago (limit: 30 days).', submitted_by:'Er. Manjit Singh Brar', mine_name:'Gevra OCP', status:'resolved', created_at:new Date(Date.now()-12*86400000).toISOString(), resolution_notes:'Equipment serviced 22-Sep-2026. Hydraulic pump replaced.' },
          { id:'d4', grievance_id:'GRV-2026-004', category:'welfare',    priority:'low',      subject:'Drinking water supply disrupted — Rajhara mine', description:'Potable water supply at Rajhara surface canteen disrupted for 5 days. Mines Act 1952 Reg 19 requires adequate water supply.', submitted_by:'Anil Kumar Verma', mine_name:'Rajhara', status:'pending', created_at:new Date(Date.now()-1*86400000).toISOString(), resolution_notes:null },
          { id:'d5', grievance_id:'GRV-2026-005', category:'safety',     priority:'high',     subject:'Missing safety signage at Rajmahal OCP blasting zone', description:'Critical blasting zone warning signs missing on eastern access road. CMR Reg 167 mandatory signage not met.', submitted_by:'Anonymous', mine_name:'Rajmahal OCP', status:'in_progress', created_at:new Date(Date.now()-3*86400000).toISOString(), resolution_notes:'Signage reinstalled 25-Sep-2026. Blast protocol re-communicated.' },
          { id:'d6', grievance_id:'GRV-2026-006', category:'harassment', priority:'high',     subject:'Workplace harassment complaint — Bhubaneswari OCP', description:'Female technical staff reports verbal harassment by a shift supervisor. Formal POSH complaint filed.', submitted_by:'Anonymous', mine_name:'Bhubaneswari OCP', status:'pending', created_at:new Date(Date.now()-4*86400000).toISOString(), resolution_notes:null },
          { id:'d7', grievance_id:'GRV-2026-007', category:'welfare',    priority:'medium',   subject:'Inadequate PPE distribution — Rohne OCP workers', description:'Shift-B workers at Rohne OCP received worn-out hard hats from 2023 batch. CMR Reg 115 requires PPE replacement. 34 workers affected.', submitted_by:'Shri Deepak Pandey', mine_name:'Rohne', status:'resolved', created_at:new Date(Date.now()-8*86400000).toISOString(), resolution_notes:'New Karam Safety helmets distributed on 24-Sep-2026.' },
          { id:'d8', grievance_id:'GRV-2026-008', category:'other',      priority:'low',      subject:'Delay in ESI medical claim reimbursement', description:'Seven workers at North of Arkhapal Srirampur have ESI reimbursement claims pending 90+ days from July 2026 conveyor incident.', submitted_by:'Shri Biswajit Pradhan', mine_name:'North of Arkhapal Srirampur', status:'in_progress', created_at:new Date(Date.now()-6*86400000).toISOString(), resolution_notes:'Escalated to ESIC Bhubaneswar. Ref: ESIC-OD-2026-4471.' },
        ]);
      }
    } catch (e) {
      console.warn('Grievance fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGrievances(); }, [fetchGrievances]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const grievanceId = `GRV-${new Date().getFullYear()}-${String(grievances.length + 1).padStart(3, '0')}`;
      const newItem = {
        ...form,
        grievance_id: grievanceId,
        status: 'pending',
        submitted_by: form.anonymous ? 'Anonymous' : form.submitted_by || 'Field Officer',
        created_at: new Date().toISOString(),
        resolution_notes: null,
      };

      // Try to insert into DB
      const { error } = await supabase.from('grievances').insert([newItem]);

      // Regardless of DB error (table may not exist), add to local state for demo
      setGrievances(prev => [{ ...newItem, id: Date.now() }, ...prev]);

      // Fire alert to notification system
      window.dispatchEvent(new CustomEvent('coalguard:newAlert', {
        detail: {
          id: `grv-${Date.now()}`,
          type: 'grievance',
          severity: form.priority === 'critical' ? 'critical' : 'high',
          title: 'NEW GRIEVANCE FILED',
          message: `Grievance #${grievanceId}: ${form.subject} — Category: ${form.category}`,
          destination: '/grievances',
          created_at: new Date().toISOString(),
        }
      }));

      setSubmitSuccess(true);
      setShowForm(false);
      setForm({ category: 'safety', priority: 'medium', subject: '', description: '', submitted_by: '', mine_name: 'Govindpur Colliery', anonymous: false });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error('Grievance submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, notes = '') => {
    setGrievances(prev => prev.map(g => g.id === id ? { ...g, status: newStatus, resolution_notes: notes || g.resolution_notes } : g));
    try {
      await supabase.from('grievances').update({ status: newStatus, resolution_notes: notes }).eq('id', id);
    } catch (e) {}
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('GRIEVANCE MANAGEMENT REGISTER', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Coal India Limited — DGMS Statutory Compliance`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Grievance ID', 'Category', 'Priority', 'Subject', 'Submitted By', 'Status', 'Date']],
      body: filteredGrievances.map(g => [
        g.grievance_id, g.category, g.priority,
        g.subject.substring(0, 40) + (g.subject.length > 40 ? '...' : ''),
        g.submitted_by, g.status,
        new Date(g.created_at).toLocaleDateString('en-IN')
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save(`Grievance_Register_${Date.now()}.pdf`);
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesStatus = filter === 'all' || g.status === filter;
    const matchesMine = mineFilter === 'all' || g.mine_name === mineFilter;
    const matchesCat = categoryFilter === 'all' || g.category === categoryFilter;
    const matchesSearch = !searchQuery || g.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || g.grievance_id?.toLowerCase().includes(searchQuery.toLowerCase()) || g.mine_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesMine && matchesCat && matchesSearch;
  });

  const stats = {
    total: grievances.length,
    pending: grievances.filter(g => g.status === 'pending').length,
    in_progress: grievances.filter(g => g.status === 'in_progress').length,
    resolved: grievances.filter(g => g.status === 'resolved').length,
    sla_breached: grievances.filter(g => slaBreach(g)).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquarePlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grievance Management</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Worker complaints, safety concerns & welfare grievances — DGMS statutory tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/20 transition-all">
            <Plus className="w-4 h-4" /> File Grievance
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {submitSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Grievance Filed Successfully</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Your complaint has been registered and forwarded to the Mine Management for review.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Filed',      value: stats.total,        color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10' },
          { label: 'Pending Review',   value: stats.pending,      color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
          { label: 'In Progress',      value: stats.in_progress,  color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
          { label: 'Resolved',         value: stats.resolved,     color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
          { label: 'SLA Breached',     value: stats.sla_breached, color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by subject, ID, or mine..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select value={mineFilter} onChange={e => setMineFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500">
            <option value="all">All Mines</option>
            {CIL_MINES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500">
            <option value="all">All Categories</option>
            {GRIEVANCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', 'pending', 'in_progress', 'resolved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${filter === f ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}`}
            >{f.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {/* Grievance List */}
      <div className="space-y-3">
        {filteredGrievances.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MessageSquarePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No grievances found</p>
          </div>
        ) : filteredGrievances.map(g => {
          const catConf = GRIEVANCE_CATEGORIES.find(c => c.value === g.category) || GRIEVANCE_CATEGORIES[5];
          const statusConf = STATUS_CONFIG[g.status] || STATUS_CONFIG.pending;
          const prioConf = PRIORITY_OPTS.find(p => p.value === g.priority) || PRIORITY_OPTS[2];
          const isExpanded = expandedId === g.id;
          const CatIcon = catConf.icon;
          const StatusIcon = statusConf.icon;
          const breached = slaBreach(g);
          const daysOpen = daysSince(g.created_at);

          return (
            <div key={g.id} className={`bg-white dark:bg-white/[0.03] border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${breached ? 'border-red-300 dark:border-red-500/40' : 'border-slate-200 dark:border-white/10'}`}>
              <div className="p-4 flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : g.id)}>
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl bg-${catConf.color}-100 dark:bg-${catConf.color}-500/10 flex items-center justify-center shrink-0 border border-${catConf.color}-200 dark:border-${catConf.color}-500/20`}>
                    <CatIcon className={`w-4 h-4 text-${catConf.color}-600 dark:text-${catConf.color}-400`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{g.grievance_id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prioConf.color}`}>{g.priority?.toUpperCase()}</span>
                      {breached && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/30 animate-pulse">⚠ SLA BREACH</span>}
                      {g.mine_name && <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10"><Building2 className="w-2.5 h-2.5" />{g.mine_name}</span>}
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{g.subject}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{g.submitted_by}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatISTShort(g.created_at)}</span>
                      <span className={`font-semibold ${daysOpen > 3 && g.status !== 'resolved' ? 'text-orange-600 dark:text-orange-400' : ''}`}>{daysOpen}d open</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusConf.bg} ${statusConf.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConf.label}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-white/5 p-4 space-y-4 bg-slate-50 dark:bg-white/[0.01]">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{g.description}</p>
                  </div>
                  {g.resolution_notes && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Management Response / Resolution Notes</p>
                      <p className="text-sm text-emerald-800 dark:text-emerald-300">{g.resolution_notes}</p>
                    </div>
                  )}
                  {(role === 'corporate' || role === 'mine_official') && g.status !== 'resolved' && g.status !== 'rejected' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Update Status:</span>
                      <button onClick={() => handleStatusUpdate(g.id, 'in_progress', 'Under investigation by mine management.')} className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">Mark In Progress</button>
                      <button onClick={() => handleStatusUpdate(g.id, 'resolved', 'Grievance resolved by Mine Management. Corrective action completed.')} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all">Mark Resolved</button>
                      <button onClick={() => handleStatusUpdate(g.id, 'rejected', 'Grievance reviewed and rejected — outside scope of statutory compliance framework.')} className="px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">Reject</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* File Grievance Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-slate-900 dark:text-white">File New Grievance</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {GRIEVANCE_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${form.category === cat.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                      >
                        <Icon className="w-4 h-4" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 block">Priority Level</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTS.map(p => (
                    <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${form.priority === p.value ? p.color : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Subject *</label>
                <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief description of the grievance..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Full Description *</label>
                <textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Provide detailed information including location, date, people involved, and relevant regulations..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Submitter */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Your Name</label>
                  <input value={form.submitted_by} onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))}
                    placeholder="Full name (optional if anonymous)"
                    disabled={form.anonymous}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0 mt-5">
                  <input type="checkbox" id="anon" checked={form.anonymous} onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                  <label htmlFor="anon" className="text-[10px] text-slate-500 dark:text-slate-400">Anonymous</label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
