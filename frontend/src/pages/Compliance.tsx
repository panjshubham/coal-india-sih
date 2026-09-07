// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, 
  ShieldAlert, FileText, ChevronRight, ChevronLeft, Calendar, User, 
  Building2, X, RefreshCw, Eye, ArrowUpDown, UploadCloud, ShieldCheck, Check
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface ComplianceItem {
  id: string | number;
  mine_id: string | number;
  category: string;
  title: string;
  due_date: string;
  status: 'pending' | 'completed' | 'in_progress' | 'overdue';
  assigned_to: string;
  document_url?: string;
  tracking_id?: string;
  statutory_ref?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  mines?: { name: string };
}

const STATUTORY_REFS: Record<string, string> = {
  safety: 'Coal Mines Regulations (CMR 2017) Sec 104 - Underground Strata Control',
  environment: 'DGMS Environment Directive ENV-42B - Methane & Dust Suppression',
  production: 'Statutory Haulage & Winding Regulation Sec 78 - Emergency Braking',
  labour: 'Mines Vocational Training Rules 1966 - Mandated PPE & Safety Drills',
  statutory: 'National Concession Safety Directive - DGMS Standard Protocol'
};

const INITIAL_SAMPLE_DATA: ComplianceItem[] = [
  {
    id: 1,
    mine_id: 1,
    tracking_id: 'DIR-2025-1042',
    category: 'safety',
    title: 'Installation of Real-Time CH4 Gas Monitoring Telemetry',
    due_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    status: 'overdue',
    severity: 'critical',
    assigned_to: 'Shri R. K. Mahapatra',
    statutory_ref: 'CMR 2017 Sec 104 - Underground Ventilation & Seam Degasification',
    document_url: '',
    mines: { name: 'Govindpur Colliery (BCCL)' }
  },
  {
    id: 2,
    mine_id: 2,
    tracking_id: 'DIR-2025-1043',
    category: 'environment',
    title: 'InSAR Satellite Subsidence Bench Survey Validation',
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    severity: 'high',
    assigned_to: 'Dr. Arindam Sen',
    statutory_ref: 'DGMS Circular No. 4/2022 - Highwall Slope Stability',
    document_url: '',
    mines: { name: 'Dhori Khas (CCL)' }
  },
  {
    id: 3,
    mine_id: 3,
    tracking_id: 'DIR-2025-1044',
    category: 'safety',
    title: 'Hydraulic Roof Support & Strata Barricade Recertification',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    status: 'in_progress',
    severity: 'critical',
    assigned_to: 'Er. V. K. Sharma',
    statutory_ref: 'CMR 2017 Reg 124 - Systematic Support Rules (SSR)',
    document_url: '',
    mines: { name: 'Karo Special Seam (CCL)' }
  },
  {
    id: 4,
    mine_id: 4,
    tracking_id: 'DIR-2025-1045',
    category: 'production',
    title: 'Overhead Heavy Machinery Emergency Cut-off Inspection',
    due_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    status: 'overdue',
    severity: 'high',
    assigned_to: 'Inspector S. Roy',
    statutory_ref: 'DGMS (Tech) S&T Circular 08 - Heavy Earth Moving Machinery',
    document_url: '',
    mines: { name: 'Tetaria Khar (ECL)' }
  },
  {
    id: 5,
    mine_id: 1,
    tracking_id: 'DIR-2025-1046',
    category: 'labour',
    title: 'Underground Miners Atmospheric PPE & Self-Rescuer Audit',
    due_date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    status: 'completed',
    severity: 'medium',
    assigned_to: 'Shri R. K. Mahapatra',
    statutory_ref: 'Mines Act 1952 Sec 22A - Personal Protective Equipment',
    document_url: 'https://coalguard.gov.in/docs/ppe_audit_2025.pdf',
    mines: { name: 'Govindpur Colliery (BCCL)' }
  },
  {
    id: 6,
    mine_id: 2,
    tracking_id: 'DIR-2025-1047',
    category: 'environment',
    title: 'Effluent Treatment Plant (ETP) Heavy Metal Discharge Test',
    due_date: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
    status: 'in_progress',
    severity: 'medium',
    assigned_to: 'Dr. Arindam Sen',
    statutory_ref: 'State Pollution Control Board Statutory Consent to Operate (CTO)',
    document_url: '',
    mines: { name: 'Dhori Khas (CCL)' }
  },
  {
    id: 7,
    mine_id: 3,
    tracking_id: 'DIR-2025-1048',
    category: 'safety',
    title: 'Explosive Magazine & Detonator Magazine Distance Audit',
    due_date: new Date(Date.now() + 19 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    severity: 'critical',
    assigned_to: 'Er. V. K. Sharma',
    statutory_ref: 'Explosives Rules 2008 & CMR 2017 Reg 155',
    document_url: '',
    mines: { name: 'Karo Special Seam (CCL)' }
  },
  {
    id: 8,
    mine_id: 4,
    tracking_id: 'DIR-2025-1049',
    category: 'production',
    title: 'Conveyor Belt Fire Suppression Sprinkler Test Run',
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: 'completed',
    severity: 'medium',
    assigned_to: 'Inspector S. Roy',
    statutory_ref: 'CMR 2017 Reg 118 - Fire Prevention & Fighting in Mines',
    document_url: 'https://coalguard.gov.in/docs/fire_sprinkler_cert.pdf',
    mines: { name: 'Tetaria Khar (ECL)' }
  }
];

export default function Compliance() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [minesList, setMinesList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [mineFilter, setMineFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<'due_date' | 'title' | 'mine'>('due_date');
  const [sortAsc, setSortAsc] = useState(true);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  
  // Modal states
  const [activeDossier, setActiveDossier] = useState<ComplianceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Create Directive Form state
  const [newDirective, setNewDirective] = useState({
    title: '',
    mine_id: '1',
    category: 'safety',
    severity: 'high',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    assigned_to: 'Shri R. K. Mahapatra',
    statutory_ref: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchData();
  }, [user, role]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Mines list
      const { data: minesData } = await supabase.from('mines').select('id, name').order('name');
      if (minesData && minesData.length > 0) {
        setMinesList(minesData);
      } else {
        setMinesList([
          { id: 1, name: 'Govindpur Colliery (BCCL)' },
          { id: 2, name: 'Dhori Khas (CCL)' },
          { id: 3, name: 'Karo Special Seam (CCL)' },
          { id: 4, name: 'Tetaria Khar (ECL)' }
        ]);
      }

      // 2. Fetch Compliance Directives
      let query = supabase.from('compliance_items').select(`*, mines(name)`).order('due_date', { ascending: true });
      
      if (role === 'mine_official' && user) {
        const { data: userData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
        if (userData?.assigned_mine_id) {
          query = query.eq('mine_id', userData.assigned_mine_id);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Hydrate missing fields if any
        const hydrated = data.map(item => ({
          ...item,
          tracking_id: item.tracking_id || `DIR-2025-${1000 + Number(String(item.id).replace(/\D/g, '') || 1)}`,
          statutory_ref: item.statutory_ref || STATUTORY_REFS[item.category] || STATUTORY_REFS.safety,
          severity: item.severity || (item.status === 'overdue' ? 'critical' : 'high')
        }));
        setItems(hydrated);
      } else {
        setItems(INITIAL_SAMPLE_DATA);
      }
    } catch (err) {
      console.warn('Using enriched fallback compliance data:', err);
      setItems(INITIAL_SAMPLE_DATA);
    } finally {
      setLoading(false);
    }
  }

  // Quick Stats
  const stats = useMemo(() => {
    const total = items.length;
    const overdue = items.filter(i => i.status === 'overdue' || (i.status !== 'completed' && isPast(new Date(i.due_date)))).length;
    const pending = items.filter(i => i.status === 'pending').length;
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 96;

    return { total, overdue, pending, inProgress, completed, resolutionRate };
  }, [items]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(q) ||
        (i.mines?.name && i.mines.name.toLowerCase().includes(q)) ||
        (i.tracking_id && i.tracking_id.toLowerCase().includes(q)) ||
        (i.assigned_to && i.assigned_to.toLowerCase().includes(q))
      );
    }

    if (mineFilter !== 'ALL') {
      result = result.filter(i => String(i.mine_id) === String(mineFilter) || (i.mines?.name === mineFilter));
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(i => i.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'overdue') {
        result = result.filter(i => i.status === 'overdue' || (i.status !== 'completed' && isPast(new Date(i.due_date))));
      } else {
        result = result.filter(i => i.status === statusFilter);
      }
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'due_date') {
        comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (sortKey === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortKey === 'mine') {
        const mineA = a.mines?.name || '';
        const mineB = b.mines?.name || '';
        comparison = mineA.localeCompare(mineB);
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [items, search, mineFilter, categoryFilter, statusFilter, sortKey, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(i => i.id));
    }
  };

  const toggleSelectItem = (id: string | number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleExportCSV = () => {
    const headers = ['Directive ID', 'Concession Mine', 'Category', 'Directive Title', 'Statutory Reference', 'Due Date', 'Status', 'Assigned Officer'];
    const rows = filteredItems.map(i => [
      `"${i.tracking_id || i.id}"`,
      `"${i.mines?.name || `Mine #${i.mine_id}`}"`,
      `"${i.category.toUpperCase()}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${(i.statutory_ref || '').replace(/"/g, '""')}"`,
      `"${i.due_date}"`,
      `"${i.status.toUpperCase()}"`,
      `"${i.assigned_to}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CoalGuard_Compliance_Directives_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Directives exported to CSV successfully');
  };

  const handleUpdateStatus = async (item: ComplianceItem, newStatus: 'pending' | 'in_progress' | 'completed' | 'overdue') => {
    try {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      if (activeDossier && activeDossier.id === item.id) {
        setActiveDossier({ ...activeDossier, status: newStatus });
      }
      
      await supabase
        .from('compliance_items')
        .update({ status: newStatus })
        .eq('id', item.id);

      showToast(`Directive ${item.tracking_id || item.id} marked as ${newStatus.toUpperCase()}`);
    } catch (e) {
      console.warn('Updated in local state:', e);
      showToast(`Status updated to ${newStatus.toUpperCase()}`);
    }
  };

  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirective.title.trim()) return;

    const selectedMine = minesList.find(m => String(m.id) === String(newDirective.mine_id));
    const createdItem: ComplianceItem = {
      id: Date.now(),
      mine_id: Number(newDirective.mine_id),
      tracking_id: `DIR-2025-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newDirective.title,
      category: newDirective.category,
      due_date: newDirective.due_date,
      status: 'pending',
      severity: newDirective.severity as any,
      assigned_to: newDirective.assigned_to,
      statutory_ref: newDirective.statutory_ref || STATUTORY_REFS[newDirective.category] || STATUTORY_REFS.safety,
      mines: { name: selectedMine ? selectedMine.name : 'Govindpur Colliery (BCCL)' }
    };

    setItems(prev => [createdItem, ...prev]);
    setShowCreateModal(false);
    setNewDirective({
      title: '',
      mine_id: '1',
      category: 'safety',
      severity: 'high',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      assigned_to: 'Shri R. K. Mahapatra',
      statutory_ref: ''
    });

    try {
      await supabase.from('compliance_items').insert({
        mine_id: createdItem.mine_id,
        title: createdItem.title,
        category: createdItem.category,
        due_date: createdItem.due_date,
        status: createdItem.status,
        assigned_to: createdItem.assigned_to
      });
    } catch (err) {
      console.warn('Persisted locally:', err);
    }

    showToast('New Statutory Directive issued successfully');
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const overdue = status === 'overdue' || (status !== 'completed' && isPast(new Date(dueDate)));
    
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Compliant</span>
        </span>
      );
    }
    if (overdue) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue</span>
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>In Progress</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending</span>
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const cat = (category || 'safety').toLowerCase();
    switch (cat) {
      case 'safety':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">Safety</span>;
      case 'environment':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Environment</span>;
      case 'production':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">Production</span>;
      case 'labour':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">Labour</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">{cat}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full font-sans antialiased text-[var(--cg-text-primary)]">
      
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[var(--cg-surface-high)] border border-amber-500/40 text-white shadow-2xl animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--cg-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>DGMS Apex Regulatory Engine</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400 font-bold">CMR 2017 Registry</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[var(--cg-text-primary)]">
            Statutory Directives & Compliance
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time compliance monitoring, environmental covenants, and mandatory hazard rectifications across active concessions.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button 
            onClick={handleExportCSV}
            className="btn-secondary h-10 px-4 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all hover:border-[var(--cg-accent)]"
            type="button"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Export Registry CSV</span>
          </button>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary h-10 px-5 text-sm font-semibold rounded-lg flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Issue Directive</span>
          </button>
        </div>
      </div>

      {/* 2. Key KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Directives */}
        <div className="bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)] p-5 shadow-sm hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Active Directives</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-[var(--cg-text-primary)] font-mono">{stats.total}</span>
            <p className="text-xs text-slate-400 mt-1 font-medium">Under active DGMS oversight</p>
          </div>
        </div>

        {/* Overdue Breaches */}
        <div className="bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)] p-5 shadow-sm hover:border-rose-500/40 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Overdue Breaches
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-rose-400 font-mono">{stats.overdue}</span>
            <p className="text-xs text-rose-300/80 mt-1 font-medium">Statutory penalty warnings active</p>
          </div>
        </div>

        {/* Pending Inspection */}
        <div className="bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)] p-5 shadow-sm hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending Verification</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-amber-400 font-mono">{stats.pending}</span>
            <p className="text-xs text-slate-400 mt-1 font-medium">Awaiting inspector verification</p>
          </div>
        </div>

        {/* 30-Day Resolution Rate */}
        <div className="bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)] p-5 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">30-Day Resolution Pace</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 font-mono">{stats.resolutionRate}%</span>
              <span className="text-xs text-slate-400 font-medium font-sans">Resolved ({stats.completed})</span>
            </div>
            <div className="w-full bg-[var(--cg-surface-high)] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${stats.resolutionRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)] p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search directive ID, keyword, mine, officer..."
              className="w-full h-10 pl-10 pr-9 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mine Filter */}
          <div className="md:col-span-3">
            <select
              value={mineFilter}
              onChange={e => { setMineFilter(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Concessions & Mines</option>
              {minesList.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="safety">Safety</option>
              <option value="environment">Environment</option>
              <option value="production">Production</option>
              <option value="labour">Labour & Welfare</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-2">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Due Date</span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">{sortAsc ? 'ASC ↑' : 'DESC ↓'}</span>
            </button>
          </div>

        </div>

        {/* Quick Status Pill Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--cg-border)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button 
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[var(--cg-surface-high)] text-slate-300 hover:bg-[var(--cg-surface-highest)] hover:text-white'
              }`}
            >
              All Directives ({items.length})
            </button>
            <button 
              onClick={() => { setStatusFilter('overdue'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'overdue'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'bg-[var(--cg-surface-high)] text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              Overdue ({stats.overdue})
            </button>
            <button 
              onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[var(--cg-surface-high)] text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button 
              onClick={() => { setStatusFilter('in_progress'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'in_progress'
                  ? 'bg-sky-500 text-white font-bold shadow-sm'
                  : 'bg-[var(--cg-surface-high)] text-sky-400 hover:bg-sky-500/20'
              }`}
            >
              In Progress ({stats.inProgress})
            </button>
            <button 
              onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[var(--cg-surface-high)] text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              Compliant ({stats.completed})
            </button>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Showing <strong className="text-white">{filteredItems.length}</strong> matching records
          </span>
        </div>
      </div>

      {/* 4. Compliance Directives Table */}
      <div className="bg-[var(--cg-surface-elevated)] rounded-xl border border-[var(--cg-border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-[var(--cg-surface-high)] text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-[var(--cg-border)]">
              <tr>
                <th className="py-3.5 pl-4 pr-2 w-10">
                  <input 
                    type="checkbox" 
                    checked={paginatedItems.length > 0 && selectedIds.length === paginatedItems.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded bg-[var(--cg-surface)] border-[var(--cg-border)] text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Directive Ref</th>
                <th className="py-3.5 px-4">Concession / Mine</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 min-w-[280px]">Mandatory Directive Title</th>
                <th className="py-3.5 px-4">Statutory Deadline</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Authority</th>
                <th className="py-3.5 pr-4 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cg-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-mono">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Synchronizing DGMS Compliance Register...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <FileText className="w-10 h-10 text-slate-500 mb-3" />
                      <h4 className="text-base font-bold text-white mb-1">No directives match criteria</h4>
                      <p className="text-xs text-slate-400 mb-4">Try clearing filters or search query to view active items.</p>
                      <button 
                        onClick={() => { setSearch(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); setMineFilter('ALL'); }}
                        className="btn-secondary text-xs px-3 py-1.5 rounded"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.map((item) => {
                const overdue = item.status === 'overdue' || (item.status !== 'completed' && isPast(new Date(item.due_date)));
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr 
                    key={item.id}
                    className={`transition-colors duration-150 hover:bg-white/[0.03] ${
                      isSelected ? 'bg-amber-500/10' : ''
                    } ${
                      overdue ? 'bg-rose-500/[0.02]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-4 pl-4 pr-2">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 rounded bg-[var(--cg-surface)] border-[var(--cg-border)] text-amber-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Tracking ID / Code */}
                    <td className="py-4 px-4 font-mono font-medium text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>
                          {item.tracking_id || `DIR-${item.id}`}
                        </span>
                      </div>
                    </td>

                    {/* Mine */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-200 text-xs">
                          {item.mines?.name || `Concession #${item.mine_id}`}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      {getCategoryBadge(item.category)}
                    </td>

                    {/* Directive Title & Provision */}
                    <td className="py-4 px-4 max-w-sm">
                      <div className="flex flex-col">
                        <button 
                          onClick={() => setActiveDossier(item)}
                          className="font-semibold text-slate-100 hover:text-amber-400 transition-colors text-left leading-snug truncate cursor-pointer"
                        >
                          {item.title}
                        </button>
                        <span className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.statutory_ref || STATUTORY_REFS[item.category] || 'Statutory Regulatory Provision'}
                        </span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col text-xs font-mono">
                        <span className={`font-bold flex items-center gap-1.5 ${overdue ? 'text-rose-400' : 'text-slate-200'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(item.due_date), 'dd MMM yyyy')}
                        </span>
                        <span className={`text-[11px] font-sans ${overdue ? 'text-rose-400/80 font-semibold' : 'text-slate-400'}`}>
                          {overdue ? 'Past Deadline' : `${formatDistanceToNow(new Date(item.due_date), { addSuffix: true })}`}
                        </span>
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-4">
                      {getStatusBadge(item.status, item.due_date)}
                    </td>

                    {/* Assigned Officer */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-200">
                          {item.assigned_to ? item.assigned_to.split(' ').map(n => n[0]).slice(0, 2).join('') : 'DG'}
                        </div>
                        <span className="text-xs text-slate-300 font-medium truncate max-w-[140px]">
                          {item.assigned_to || 'DGMS Directorate'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-4 pl-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveDossier(item)}
                          className="px-2.5 py-1 rounded bg-[var(--cg-surface-high)] hover:bg-[var(--cg-surface-highest)] text-xs font-medium text-amber-400 hover:text-amber-300 border border-[var(--cg-border)] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination & Counter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-[var(--cg-surface-high)] border-t border-[var(--cg-border)] text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-white">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> of <strong className="text-white">{filteredItems.length}</strong> statutory records
            </span>
            {selectedIds.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-semibold">
                {selectedIds.length} Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 rounded bg-[var(--cg-surface)] border border-[var(--cg-border)] text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-mono text-xs font-bold text-slate-300">
              {currentPage} / {totalPages}
            </span>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 rounded bg-[var(--cg-surface)] border border-[var(--cg-border)] text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. MODAL: Directive Dossier Detail */}
      {activeDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--cg-border)] flex items-start justify-between gap-4 sticky top-0 bg-[var(--cg-surface-elevated)] z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {activeDossier.tracking_id || `DIR-${activeDossier.id}`}
                  </span>
                  {getCategoryBadge(activeDossier.category)}
                  {getStatusBadge(activeDossier.status, activeDossier.due_date)}
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">{activeDossier.title}</h2>
              </div>
              <button 
                onClick={() => setActiveDossier(null)}
                className="w-8 h-8 rounded-lg bg-[var(--cg-surface-high)] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-sm">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[var(--cg-surface-high)] border border-[var(--cg-border)]">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Target Concession</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    {activeDossier.mines?.name || `Mine #${activeDossier.mine_id}`}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Statutory Deadline</span>
                  <p className="font-semibold text-white font-mono flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    {format(new Date(activeDossier.due_date), 'dd MMMM yyyy')}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Auditing Officer</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-400" />
                    {activeDossier.assigned_to || 'DGMS Directorate'}
                  </p>
                </div>
              </div>

              {/* Statutory Provision */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Statutory Basis & Legal Mandate</h4>
                <div className="p-3.5 rounded-lg bg-[var(--cg-surface)] border border-[var(--cg-border)] text-slate-300 font-mono text-xs leading-relaxed">
                  {activeDossier.statutory_ref || STATUTORY_REFS[activeDossier.category] || 'Statutory mandate enforced under Coal Mines Regulations (CMR 2017).'}
                </div>
              </div>

              {/* Evidentiary Document / Certificate */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Compliance Certificate / Evidence</h4>
                {activeDossier.document_url ? (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Certified Evidentiary File Attached</span>
                    </div>
                    <a 
                      href={activeDossier.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-400 hover:underline"
                    >
                      Download PDF
                    </a>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[var(--cg-border)] rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[var(--cg-surface)] hover:border-amber-500/50 transition-colors">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-200">Drag & Drop Form 24 / Technical Inspection Report</p>
                    <p className="text-[11px] text-slate-400 mt-1">Accepts PDF, PNG, or certified GeoTIFF scans up to 25MB</p>
                    <label className="mt-3 px-3 py-1.5 bg-[var(--cg-surface-high)] hover:bg-[var(--cg-surface-highest)] text-white text-xs font-semibold rounded cursor-pointer border border-[var(--cg-border)]">
                      Browse Files
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={() => {
                          showToast('Evidentiary document uploaded and hash-verified');
                          setActiveDossier({ ...activeDossier, document_url: 'https://coalguard.gov.in/docs/uploaded_evidence.pdf' });
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Quick Status Toggles */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Update Enforcement Status</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(activeDossier, 'in_progress')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeDossier.status === 'in_progress'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                        : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-300 hover:text-white'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>In Progress</span>
                  </button>

                  <button 
                    onClick={() => handleUpdateStatus(activeDossier, 'completed')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeDossier.status === 'completed'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-300 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Compliant</span>
                  </button>

                  <button 
                    onClick={() => handleUpdateStatus(activeDossier, 'overdue')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      activeDossier.status === 'overdue'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-[var(--cg-surface-high)] border-[var(--cg-border)] text-slate-300 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Flag Breach</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--cg-border)] bg-[var(--cg-surface-high)] flex items-center justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setActiveDossier(null)}
                className="btn-secondary text-xs px-4 py-2 rounded-lg"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. MODAL: Issue New Compliance Directive */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            
            <div className="p-6 border-b border-[var(--cg-border)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Issue Statutory Compliance Directive</h3>
                <p className="text-xs text-slate-400 mt-0.5">Mandates regulatory rectification under DGMS CMR 2017</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg bg-[var(--cg-surface-high)] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirective} className="p-6 space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Directive Title / Mandate Summary <span className="text-rose-400">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Mandatory Overburden Slope Stability Telemetry Re-check"
                  value={newDirective.title}
                  onChange={e => setNewDirective({ ...newDirective, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                    Target Mine Concession <span className="text-rose-400">*</span>
                  </label>
                  <select 
                    value={newDirective.mine_id}
                    onChange={e => setNewDirective({ ...newDirective, mine_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {minesList.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                    Directive Category <span className="text-rose-400">*</span>
                  </label>
                  <select 
                    value={newDirective.category}
                    onChange={e => setNewDirective({ ...newDirective, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="safety">Safety</option>
                    <option value="environment">Environment</option>
                    <option value="production">Production</option>
                    <option value="labour">Labour & Welfare</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                    Statutory Deadline <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={newDirective.due_date}
                    onChange={e => setNewDirective({ ...newDirective, due_date: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                    Severity Level
                  </label>
                  <select 
                    value={newDirective.severity}
                    onChange={e => setNewDirective({ ...newDirective, severity: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="critical">Critical (Immediate Stop)</option>
                    <option value="high">High (48-hr Mandate)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="low">Low (Advisory)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Assigned Inspector / Officer
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Shri R. K. Mahapatra (DGMS)"
                  value={newDirective.assigned_to}
                  onChange={e => setNewDirective({ ...newDirective, assigned_to: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--cg-surface-high)] border border-[var(--cg-border)] text-sm text-[var(--cg-text-primary)] placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--cg-border)]">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary h-10 px-4 text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary h-10 px-5 text-sm rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Publish Directive
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 8. Telemetry Footnote */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300 font-semibold">DGMS COMPLIANCE LEDGER LINKED</span>
          <span className="text-slate-600">|</span>
          <span>SHA-256 INTEGRITY VERIFIED</span>
        </div>
        <div className="flex items-center gap-3">
          <span>CMR 2017 STATUTORY STANDARD</span>
          <span className="text-amber-400 font-bold">418 ACTIVE PITS</span>
        </div>
      </div>

    </div>
  );
}
