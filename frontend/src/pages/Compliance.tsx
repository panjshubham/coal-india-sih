import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Upload } from 'lucide-react';

interface ComplianceItem {
  id: number;
  mine_id: number;
  category: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to: string;
  document_url: string;
  mines?: { name: string };
}

export default function Compliance() {
  const { user, role } = useAuth();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [user, role]);

  async function fetchData() {
    if (!user || !role) return;
    setLoading(true);
    
    try {
      let query = supabase.from('compliance_items').select(`*, mines(name)`);
      
      if (role === 'mine_official') {
        const { data: userData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
        if (userData?.assigned_mine_id) {
          query = query.eq('mine_id', userData.assigned_mine_id);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setItems(data as ComplianceItem[]);
    } catch (err) {
      console.error('Failed to fetch compliance items', err);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))), [items]);
  const statuses = useMemo(() => Array.from(new Set(items.map(i => i.status))), [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(s) || 
        (i.mines?.name && i.mines.name.toLowerCase().includes(s))
      );
    }
    if (categoryFilter !== 'ALL') result = result.filter(i => i.category === categoryFilter);
    if (statusFilter !== 'ALL') result = result.filter(i => i.status === statusFilter);
    
    result.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
    
    return result;
  }, [items, search, categoryFilter, statusFilter, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isOverdue = (item: ComplianceItem) => {
    if (item.status === 'completed') return false;
    return new Date(item.due_date).getTime() < new Date().getTime();
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <>
      <style>{`
        .bg-surface { background-color: #0b1326; }
        .bg-surface-container-low { background-color: #131b2e; }
        .bg-surface-container-lowest { background-color: #060e20; }
        .bg-surface-container { background-color: #171f33; }
        .bg-surface-container-high { background-color: #222a3d; }
        .bg-surface-container-highest { background-color: #2d3449; }
        .bg-primary { background-color: #8ed5ff; }
        .bg-secondary { background-color: #ffb95f; }
        .bg-error-container { background-color: #93000a; }
        .bg-secondary-container { background-color: #ee9800; }
        .bg-surface-variant { background-color: #2d3449; }
        
        .text-on-surface { color: #dae2fd; }
        .text-on-surface-variant { color: #bdc8d1; }
        .text-primary { color: #8ed5ff; }
        .text-secondary { color: #ffb95f; }
        .text-error { color: #ffb4ab; }
        .text-outline { color: #87929a; }
        .text-on-primary { color: #00354a; }
        .text-on-secondary { color: #472a00; }
        .text-on-secondary-container { color: #5b3800; }

        .px-space-xs { padding-left: 0.25rem; padding-right: 0.25rem; }
        .py-space-xs { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .mt-space-2xs { margin-top: 0.125rem; }
        .px-space-sm { padding-left: 0.5rem; padding-right: 0.5rem; }
        .py-space-sm { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .ml-space-xs { margin-left: 0.25rem; }
        .mr-space-xs { margin-right: 0.25rem; }
        .px-space-md { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-space-md { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .pl-space-md { padding-left: 0.75rem; }
        .pr-space-md { padding-right: 0.75rem; }
        .px-space-lg { padding-left: 1rem; padding-right: 1rem; }
        .py-space-lg { padding-top: 1rem; padding-bottom: 1rem; }
        .pl-space-lg { padding-left: 1rem; }
        .pr-space-lg { padding-right: 1rem; }
        
        .gap-space-xs { gap: 0.25rem; }
        .gap-space-sm { gap: 0.5rem; }
        .gap-space-md { gap: 0.75rem; }
        .mt-space-xs { margin-top: 0.25rem; }
        .mt-space-md { margin-top: 0.75rem; }
        .pt-space-xs { padding-top: 0.25rem; }
        .p-space-sm { padding: 0.5rem; }
        .p-space-md { padding: 0.75rem; }
        
        .font-headline-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.015em; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 20px; line-height: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .font-body-md { font-family: 'Geist', sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; }
        .font-body-sm { font-family: 'Geist', sans-serif; font-size: 12px; line-height: 18px; font-weight: 400; }
        .font-label-md { font-family: 'Geist', sans-serif; font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.04em; }
        .font-code-sm { font-family: 'Geist', monospace; font-size: 12px; line-height: 16px; font-weight: 400; }
      `}</style>
      
      <div className="flex flex-col w-full min-h-screen bg-surface font-body-md text-on-surface">
        {/* Header & Meta */}
        <div className="z-30 flex flex-col px-space-lg py-space-md mb-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs font-label-md text-outline tracking-wider uppercase">
                <span className="text-on-surface-variant font-medium">DGMS CENTRAL ENGINE</span>
                <span>/</span>
                <span className="text-primary font-medium tracking-widest">STATUTORY AUDIT & COMPLIANCE REGISTRY</span>
                <span className="ml-space-xs px-1.5 py-0.5 rounded bg-surface-container-highest text-primary text-[10px] font-mono">LIVE FEED</span>
              </div>
              <div className="flex items-baseline gap-space-sm mt-space-2xs">
                <h1 className="font-headline-lg text-on-surface tracking-tight">Statutory Directives & Compliance</h1>
                <span className="font-body-sm text-on-surface-variant hidden md:inline">Coal Mines Regulations (CMR 2017) Enforced</span>
              </div>
            </div>
            
            <div className="flex items-center flex-wrap gap-space-sm">
              <button className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-body-sm shadow-sm" type="button">
                <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                <span>Export CSV / Form 24</span>
              </button>
              <button className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 transition-all font-body-sm font-medium shadow-md shadow-secondary/10" type="button">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ Create Compliance Directive</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm mt-space-md pt-space-xs">
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container shadow-sm">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase tracking-wider">Total Active Directives</span>
                <span className="font-headline-md text-on-surface font-semibold tracking-tight mt-space-2xs">{items.length}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">assignment</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container shadow-sm">
              <div className="flex flex-col">
                <span className="font-label-md text-error tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                  Overdue Breaches
                </span>
                <span className="font-headline-md text-error font-semibold tracking-tight mt-space-2xs">
                  {items.filter(isOverdue).length}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container shadow-sm">
              <div className="flex flex-col">
                <span className="font-label-md text-secondary tracking-wider uppercase">Pending Inspection</span>
                <span className="font-headline-md text-secondary font-semibold tracking-tight mt-space-2xs">
                  {items.filter(i => i.status === 'pending').length}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container shadow-sm">
              <div className="flex flex-col">
                <span className="font-label-md text-outline uppercase tracking-wider">30-Day Resolution Rate</span>
                <span className="font-headline-md text-primary font-semibold tracking-tight mt-space-2xs">96.2%</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main View Container */}
        <div className="px-space-lg py-space-md flex flex-col gap-space-md">
          
          {/* Filters & Toolbars */}
          <div className="flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container-low shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
              {/* Search */}
              <div className="md:col-span-4 relative flex items-center">
                <span className="material-symbols-outlined absolute left-space-sm text-outline text-[18px]">search</span>
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 pl-9 pr-space-md rounded-lg bg-surface-container text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-high transition-colors border border-transparent focus:border-primary/30" 
                  placeholder="Search by mine, directive ID, keyword..." 
                />
              </div>
              
              {/* Filter: Mine (Disabled / Visual Only for now) */}
              <div className="md:col-span-2 relative">
                <select className="w-full h-8 px-space-sm pr-8 rounded-lg bg-surface-container text-body-sm text-on-surface appearance-none focus:outline-none cursor-pointer">
                  <option value="all">All Concessions</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">expand_more</span>
              </div>
              
              {/* Filter: Category */}
              <div className="md:col-span-2 relative">
                <select 
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-space-sm pr-8 rounded-lg bg-surface-container text-body-sm text-on-surface appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">expand_more</span>
              </div>
              
              {/* Filter: Status */}
              <div className="md:col-span-2 relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full h-8 px-space-sm pr-8 rounded-lg bg-surface-container text-body-sm text-on-surface appearance-none focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">expand_more</span>
              </div>
              
              {/* Filter: Inspector (Visual Only) */}
              <div className="md:col-span-2 relative">
                <select className="w-full h-8 px-space-sm pr-8 rounded-lg bg-surface-container text-body-sm text-on-surface appearance-none focus:outline-none cursor-pointer">
                  <option value="all">All Inspectors</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-outline text-[16px]">expand_more</span>
              </div>
            </div>
            
            {/* Secondary Filter Strip */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm pt-space-xs">
              <div className="flex items-center flex-wrap gap-space-xs">
                <span className="font-label-md text-outline uppercase mr-space-xs">Quick Views:</span>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/30 text-error hover:bg-error-container/50 transition-colors font-label-md" type="button">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                  <span>Overdue ({items.filter(isOverdue).length})</span>
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-primary hover:bg-surface-container-high transition-colors font-label-md" type="button">
                  <span>Pending ({items.filter(i => i.status === 'pending').length})</span>
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-md" type="button">
                  <span>Cleared Today</span>
                </button>
              </div>
              
              <div className="flex items-center gap-space-md self-end lg:self-auto">
                <span className="font-code-sm text-on-surface-variant">
                  Showing <span className="text-on-surface font-semibold">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of {filteredItems.length} Records
                </span>
                <div className="h-4 w-px bg-surface-variant"></div>
                <button className="p-1 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="Customize Columns" type="button">
                  <span className="material-symbols-outlined text-[18px]">view_column</span>
                </button>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="w-full overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest text-outline font-label-md uppercase tracking-wider">
                    <th className="py-space-md pl-space-lg pr-space-sm w-10">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded bg-surface-container cursor-pointer accent-primary border-0" />
                    </th>
                    <th className="py-space-md px-space-md w-56">Mine / Concession</th>
                    <th className="py-space-md px-space-md w-40">Category</th>
                    <th className="py-space-md px-space-md min-w-[280px]">Directive / Compliance Title</th>
                    <th className="py-space-md px-space-md w-48 cursor-pointer hover:text-on-surface transition-colors" onClick={() => setSortAsc(!sortAsc)}>
                      Due Date {sortAsc ? '↑' : '↓'}
                    </th>
                    <th className="py-space-md px-space-md w-36">Status</th>
                    <th className="py-space-md px-space-md w-52">Assigned Inspector</th>
                    <th className="py-space-md pr-space-lg pl-space-md text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container/60 font-body-sm text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-on-surface-variant font-code-sm">Loading telemetry...</td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-on-surface-variant font-code-sm">No compliance items found.</td>
                    </tr>
                  ) : paginatedItems.map((item, idx) => {
                    const overdue = isOverdue(item);
                    
                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors hover:bg-surface-container-high/50 ${
                          overdue ? 'border-l-4 border-red-500 bg-red-950/10 hover:bg-red-950/20' : 'border-l-4 border-transparent'
                        }`}
                      >
                        <td className="py-space-md pl-space-lg pr-space-sm">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded bg-surface-container cursor-pointer accent-primary border-0" />
                        </td>
                        <td className="py-space-md px-space-md">
                          <div className="flex flex-col">
                            <span className="font-body-md font-medium leading-snug truncate max-w-[200px]">{item.mines?.name || `Mine #${item.mine_id}`}</span>
                            <span className="font-code-sm text-on-surface-variant">Concession Zone</span>
                          </div>
                        </td>
                        <td className="py-space-md px-space-md">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-space-md px-space-md">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-code-sm font-medium ${overdue ? 'text-error' : item.status === 'completed' ? 'text-outline' : 'text-primary'}`}>
                                DIR-{new Date(item.due_date).getFullYear()}-{1000 + item.id}
                              </span>
                              <span className="font-body-md font-medium truncate max-w-[300px]">{item.title}</span>
                            </div>
                            <span className="font-label-md text-outline">Statutory Provision: General Obligation</span>
                          </div>
                        </td>
                        <td className="py-space-md px-space-md whitespace-nowrap">
                          <div className="flex flex-col font-mono text-code-sm">
                            <span className={`font-medium flex items-center gap-1 ${overdue ? 'text-error' : 'text-on-surface'}`}>
                              {overdue && <span className="material-symbols-outlined text-[14px]">event_busy</span>}
                              {format(new Date(item.due_date), 'dd MMM yyyy')}
                            </span>
                            {overdue ? (
                              <span className="text-error/80 text-[11px] font-sans">Breached</span>
                            ) : item.status === 'completed' ? (
                              <span className="text-primary text-[11px] font-sans">Audit Cleared</span>
                            ) : (
                              <span className="text-outline text-[11px] font-sans">Upcoming</span>
                            )}
                          </div>
                        </td>
                        <td className="py-space-md px-space-md whitespace-nowrap">
                          {item.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-label-md font-semibold tracking-wide uppercase">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              Compliant
                            </span>
                          ) : overdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/60 text-red-400 border border-red-800/60 text-label-md font-semibold tracking-wide uppercase">
                              <span className="material-symbols-outlined text-[12px]">warning</span>
                              Overdue
                            </span>
                          ) : item.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 text-label-md font-semibold tracking-wide uppercase">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-800/60 text-label-md font-semibold tracking-wide uppercase">
                              <span className="material-symbols-outlined text-[12px]">sync</span>
                              In Progress
                            </span>
                          )}
                        </td>
                        <td className="py-space-md px-space-md">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                              overdue ? 'bg-error-container text-error' : 
                              item.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 
                              'bg-surface-container-highest text-primary'
                            }`}>
                              {getInitials(item.assigned_to)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-body-sm font-medium leading-none">{item.assigned_to || 'Unassigned'}</span>
                              <span className="font-label-md text-on-surface-variant leading-none mt-1">Inspector</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-space-md pr-space-lg pl-space-md text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1 rounded hover:bg-surface-container text-primary hover:text-on-surface font-body-sm text-[12px] font-medium transition-colors" type="button">
                              Dossier
                            </button>
                            <button className="p-1 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors" type="button">
                              <span className="material-symbols-outlined text-[16px]">more_vert</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Bar */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md px-space-lg py-space-md bg-surface-container-lowest border-t border-surface-container">
                <div className="flex items-center gap-space-md">
                  <span className="font-body-sm text-on-surface-variant">
                    Showing <span className="font-medium text-on-surface">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-on-surface">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of <span className="font-medium text-on-surface">{filteredItems.length}</span> items
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container-high font-body-sm transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-body-sm transition-colors disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Telemetry Audit Banner Footnote */}
          <div className="flex flex-col md:flex-row items-center justify-between p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant font-code-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>CENTRAL DGMS TELEMETRY BUS ACTIVE // LAST SYNC: {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })} IST</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] mt-2 md:mt-0">
              <span className="text-outline">MINISTRY OF COAL DIRECTIVE REGISTRY</span>
              <span className="font-mono text-primary">SHA-256: e87c4a12..9f</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
