import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileText, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Tesseract from 'tesseract.js';

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
  const itemsPerPage = 20;

  // OCR Upload Modal State
  const [uploadModalItem, setUploadModalItem] = useState<ComplianceItem | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [scannedDate, setScannedDate] = useState('');
  const [scannedRef, setScannedRef] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

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
    if (item.status === 'overdue') return true;
    if (item.status === 'completed') return false;
    return new Date(item.due_date).getTime() < new Date().getTime();
  };

  const openUploadModal = (item: ComplianceItem) => {
    setUploadModalItem(item);
    setUploadFile(null);
    setScannedDate('');
    setScannedRef('');
    setOcrLoading(false);
  };

  const closeUploadModal = () => {
    setUploadModalItem(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    
    if (file.type.startsWith('image/')) {
      setOcrLoading(true);
      try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        
        // Match dates like DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
        const dateMatch = text.match(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/);
        if (dateMatch) setScannedDate(dateMatch[0]);
        
        // Match Ref No like "Ref: XYZ-123" or "No. 456"
        const refMatch = text.match(/(?:Ref|No|Reference|Ref No)[\s\.:]*([A-Z0-9\-]+)/i);
        if (refMatch && refMatch[1]) setScannedRef(refMatch[1]);
        
      } catch(err) {
        console.error("OCR Failed:", err);
      } finally {
        setOcrLoading(false);
      }
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalItem) return;
    setSubmitLoading(true);
    
    try {
      // Fake upload URL for demo
      const fakeUrl = 'https://example.com/uploaded_doc.pdf';
      
      const { error } = await supabase
        .from('compliance_items')
        .update({ 
          status: 'completed',
          document_url: fakeUrl,
          // Append scanned info to title just to persist the OCR extraction somewhere visually
          title: scannedRef ? `${uploadModalItem.title} (Ref: ${scannedRef})` : uploadModalItem.title
        })
        .eq('id', uploadModalItem.id);
        
      if (!error) {
        await fetchData();
        closeUploadModal();
      }
    } catch(err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-slate-50 min-h-screen relative font-sans">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight mb-2">Statutory Compliance Tracker</h1>
          <p className="text-slate-500">Monitor and manage DGMS regulatory obligations.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between p-4 bg-white border border-slate-200 rounded shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by title or mine..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 h-10 border border-slate-300 rounded text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-48 flex items-center">
              <Filter className="absolute left-3 w-4 h-4 text-slate-400" />
              <select 
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 h-10 border border-slate-300 rounded text-sm bg-white appearance-none focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="relative w-full md:w-48 flex items-center">
              <Filter className="absolute left-3 w-4 h-4 text-slate-400" />
              <select 
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 h-10 border border-slate-300 rounded text-sm bg-white appearance-none focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Statuses</option>
                {statuses.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">Mine</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setSortAsc(!sortAsc)}>
                    <div className="flex items-center gap-1">
                      Due Date <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No compliance items found.</td>
                  </tr>
                ) : (
                  paginatedItems.map(item => {
                    const overdue = isOverdue(item);
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50 transition-colors ${overdue ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-transparent'}`}
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">{item.mines?.name || `Mine #${item.mine_id}`}</td>
                        <td className="px-6 py-4 text-slate-600">{item.category}</td>
                        <td className="px-6 py-4 text-slate-800 max-w-xs truncate" title={item.title}>{item.title}</td>
                        <td className={`px-6 py-4 font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                          {format(new Date(item.due_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                            overdue ? 'bg-red-100 text-red-800' : 
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {overdue && item.status !== 'completed' ? 'OVERDUE' : item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.document_url ? (
                            <a href={item.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700">
                              <FileText className="w-4 h-4" /> View Doc
                            </a>
                          ) : (
                            <button 
                              onClick={() => openUploadModal(item)}
                              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Upload className="w-4 h-4" /> Upload
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
              <span className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of <span className="font-medium text-slate-900">{filteredItems.length}</span> results
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-600 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-600 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OCR Upload Modal */}
      {uploadModalItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-lg text-slate-900">Upload Compliance Document</h2>
              <button onClick={closeUploadModal} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-slate-600 mb-6">
                Uploading document for: <strong className="text-slate-900">{uploadModalItem.title}</strong>
              </p>

              <form onSubmit={handleModalSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Document Image</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded p-2"
                  />
                  {ocrLoading && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 font-bold bg-amber-50 p-2 rounded">
                      <Loader2 className="w-4 h-4 animate-spin" /> Analyzing document via AI (OCR)...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Detected Date</label>
                    <input 
                      type="text" 
                      value={scannedDate}
                      onChange={(e) => setScannedDate(e.target.value)}
                      placeholder="e.g. 12/04/2024"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reference No.</label>
                    <input 
                      type="text" 
                      value={scannedRef}
                      onChange={(e) => setScannedRef(e.target.value)}
                      placeholder="e.g. REF-123"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={closeUploadModal}
                    className="px-4 py-2 rounded text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!uploadFile || submitLoading || ocrLoading}
                    className="px-4 py-2 rounded text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Confirm & Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
