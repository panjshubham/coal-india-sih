import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { HelpCircle, Clock, CheckCircle, Circle, RefreshCw } from 'lucide-react';

interface Ticket {
  id: string;
  user_id: string;
  role: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}

export default function AdminTickets() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();

    // Subscribe to real-time changes
    const channel = supabase.channel('public:support_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic update
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as Ticket['status'] } : t));
    
    await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', id);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'open':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20"><Circle className="w-3 h-3"/> Open</span>;
      case 'in_progress':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3"/> In Progress</span>;
      case 'resolved':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3 h-3"/> Resolved</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto" style={{ color: 'var(--cg-text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: 'var(--cg-border)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <HelpCircle className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('admin_tickets_title')}</h1>
            <p className="text-sm font-mono mt-1" style={{ color: 'var(--cg-text-muted)' }}>
              {t('admin_tickets_desc')}
            </p>
          </div>
        </div>
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ backgroundColor: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase font-bold tracking-widest border-b" style={{ backgroundColor: 'var(--cg-surface-elevated)', borderColor: 'var(--cg-border)', color: 'var(--cg-text-muted)' }}>
            <tr>
              <th className="px-6 py-4">{t('table_col_ticket_id')}</th>
              <th className="px-6 py-4">{t('table_col_date')}</th>
              <th className="px-6 py-4">{t('table_col_user')}</th>
              <th className="px-6 py-4">{t('help_ticket_category')}</th>
              <th className="px-6 py-4">{t('table_col_subject')}</th>
              <th className="px-6 py-4">{t('table_col_status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--cg-border)' }}>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center" style={{ color: 'var(--cg-text-muted)' }}>
                  {loading ? 'Loading tickets...' : 'No tickets found.'}
                </td>
              </tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{ticket.id.substring(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">{new Date(ticket.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold">{ticket.role.toUpperCase()}</div>
                    <div className="text-[10px] font-mono opacity-60 truncate max-w-[120px]">{ticket.user_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-white/10 rounded-md text-xs">{ticket.category}</span></td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{ticket.subject}</div>
                    <div className="text-xs opacity-70 mt-1 line-clamp-1">{ticket.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      className="bg-transparent border border-white/20 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-amber-400"
                    >
                      <option value="open" className="bg-slate-900">OPEN</option>
                      <option value="in_progress" className="bg-slate-900">IN PROGRESS</option>
                      <option value="resolved" className="bg-slate-900">RESOLVED</option>
                    </select>
                    <div className="mt-2">
                      <StatusBadge status={ticket.status} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
