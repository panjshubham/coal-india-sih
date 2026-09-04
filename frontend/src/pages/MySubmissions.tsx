import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { getPendingSubmissions } from '../services/db';
import { CheckCircle2, CloudOff, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface PendingSubmission {
  id: number;
  payload: any;
  timestamp: string;
}

interface SyncedSubmission {
  id: number;
  category: string;
  severity: string;
  created_at: string;
  mines?: { name: string };
}

export default function MySubmissions() {
  const { user, role } = useAuth();
  
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [synced, setSynced] = useState<SyncedSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    window.addEventListener('coalguard:syncQueueUpdated', fetchData);
    return () => window.removeEventListener('coalguard:syncQueueUpdated', fetchData);
  }, [user]);

  async function fetchData() {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch Offline Submissions
      const pendingItems = await getPendingSubmissions();
      setPending(pendingItems as unknown as PendingSubmission[]);

      // 2. Fetch Synced Submissions (Recent violations for their mine if mine_official)
      let query = supabase.from('violations').select('id, category, severity, created_at, mines(name)').order('created_at', { ascending: false }).limit(20);
      
      if (role === 'mine_official') {
        const { data: uData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
        if (uData?.assigned_mine_id) {
          query = query.eq('mine_id', uData.assigned_mine_id);
        }
      }

      const { data: syncedData } = await query;
      if (syncedData) {
        setSynced((syncedData || []) as unknown as SyncedSubmission[]);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityBadge = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      default: return 'bg-emerald-100 text-emerald-800';
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading submissions...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">My Submissions</h1>
        <p className="text-sm text-slate-500 mt-1">Track your recent statutory field reports and offline sync status.</p>
      </div>

      <div className="space-y-6">
        
        {/* Pending Queue */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-amber-50 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
              <CloudOff className="w-4 h-4" /> Pending Sync ({pending.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pending.map(item => (
              <div key={item.id} className="p-5 flex items-center justify-between bg-amber-50/30">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getSeverityBadge(item.payload.severity)}`}>
                      {item.payload.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.payload.category}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Mine ID: {item.payload.mineId}</h4>
                  {item.payload.lat && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-mono">
                      <MapPin className="w-3 h-3" /> {item.payload.lat.toFixed(4)}, {item.payload.lng.toFixed(4)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-amber-600 block mb-1">Waiting for connection...</span>
                  <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">No pending offline submissions.</div>
            )}
          </div>
        </div>

        {/* Synced List */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> Synced to Server
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {synced.map(item => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getSeverityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.category}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{item.mines?.name}</h4>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between">
                  <span className="text-xs font-medium text-emerald-600 mb-1 flex items-center gap-1">
                    Synced <CheckCircle2 className="w-3 h-3" />
                  </span>
                  <span className="text-xs text-slate-400 mr-4 sm:mr-0">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                  <Link to={`/violations/${item.id}`} className="text-xs font-bold text-blue-600 hover:underline sm:hidden mt-2">View</Link>
                </div>
                <Link to={`/violations/${item.id}`} className="hidden sm:inline-flex px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded transition-colors">
                  View Detail
                </Link>
              </div>
            ))}
            {synced.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">No recent synced submissions found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
