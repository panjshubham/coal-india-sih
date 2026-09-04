import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Search, Hash, Clock, ShieldCheck, ChevronLeft, ChevronRight, Key } from 'lucide-react';
import { format } from 'date-fns';

interface AuditRecord {
  id: number;
  timestamp: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: number;
  data_hash: string;
  prev_hash: string;
  users?: { name?: string; email?: string } | null;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [page, searchTerm]);

  async function fetchLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_ledger')
        .select('*, users(name, email)', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,table_name.ilike.%${searchTerm}%`);
      }

      query = query
        .order('timestamp', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      const { data, count, error } = await query;
      
      if (error) {
        // Fallback if users table join fails
        console.warn("Join failed, fetching without users relation", error);
        let fallbackQuery = supabase
          .from('audit_ledger')
          .select('*', { count: 'exact' });
          
        if (searchTerm) {
          fallbackQuery = fallbackQuery.or(`action.ilike.%${searchTerm}%,table_name.ilike.%${searchTerm}%`);
        }
        
        fallbackQuery = fallbackQuery
          .order('timestamp', { ascending: false })
          .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
          
        const fb = await fallbackQuery;
        if (fb.data) setLogs(fb.data as AuditRecord[]);
        if (fb.count !== null) setTotalCount(fb.count);
      } else {
        if (data) setLogs(data as unknown as AuditRecord[]);
        if (count !== null) setTotalCount(count);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  const formatHash = (hash: string) => {
    if (!hash || hash === 'GENESIS') return 'GENESIS';
    return hash.substring(0, 8);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Key className="w-6 h-6 text-slate-700" />
            Cryptographic Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">Immutable ledger of all critical system actions and data mutations.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search actions, tables..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded shadow-sm text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 w-full sm:w-64 bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">User</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Target</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Hash Chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">Loading ledger...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No audit records found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800">
                        {log.users?.name || log.users?.email || log.user_id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{log.table_name}</span>
                        <span className="text-xs text-slate-400 font-mono">ID: {log.record_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5" title="Data Hash">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-1.5 rounded">{formatHash(log.data_hash)}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Previous Hash">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-mono text-slate-500">{formatHash(log.prev_hash)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing <span className="font-bold">{Math.min((page - 1) * itemsPerPage + 1, totalCount)}</span> to <span className="font-bold">{Math.min(page * itemsPerPage, totalCount)}</span> of <span className="font-bold">{totalCount}</span> entries
          </p>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
