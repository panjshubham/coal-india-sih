import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Bell } from 'lucide-react';

export default function AlertBell() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase.channel('alerts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Play notification sound
        try {
          const audio = new Audio('/alert.mp3');
          audio.play().catch(e => console.log('Audio blocked', e));
        } catch(e) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAlerts() {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (data) {
      setAlerts(data);
      setUnreadCount(data.filter(a => !a.is_read).length);
    }
  }

  async function markAsRead() {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadIds.length > 0) {
        await supabase.from('alerts').update({ is_read: true }).in('id', unreadIds);
        setUnreadCount(0);
        setAlerts(alerts.map(a => ({ ...a, is_read: true })));
      }
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={markAsRead}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-800">System Alerts</h3>
            {unreadCount > 0 && <span className="text-xs text-slate-500">{unreadCount} new</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">No recent alerts.</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`p-4 border-b border-slate-50 flex gap-3 ${!alert.is_read ? 'bg-blue-50/50' : 'bg-white'}`}>
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${alert.severity === 'critical' ? 'bg-red-500 animate-ping' : alert.severity === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-tight mb-1">{alert.message}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
