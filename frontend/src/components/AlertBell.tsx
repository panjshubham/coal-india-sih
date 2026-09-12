import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Bell, CheckCheck, AlertCircle } from 'lucide-react';
import { formatISTShort } from '../lib/dateUtils';

export default function AlertBell() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAlerts();

    const channel = supabase.channel('alerts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        try {
          const audio = new Audio('/alert.mp3');
          audio.play().catch(() => {});
        } catch(e) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle outside click to close popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

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

  async function toggleMenu() {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && unreadCount > 0) {
      const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadIds.length > 0) {
        await supabase.from('alerts').update({ is_read: true }).in('id', unreadIds);
        setUnreadCount(0);
        setAlerts(alerts.map(a => ({ ...a, is_read: true })));
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        id="cg-alert-bell"
        onClick={toggleMenu}
        aria-label="System Alerts"
        title="System Alerts"
        type="button"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none"
        style={{ 
          background: 'var(--cg-surface-elevated)', 
          border: '1px solid var(--cg-border)',
          color: 'var(--cg-text-secondary)'
        }}
      >
        <Bell className="w-4 h-4 hover:text-amber-400 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 border-2 border-[var(--cg-bg)] rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-84 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            backgroundColor: 'var(--cg-surface)', 
            border: '1px solid var(--cg-border-strong)',
            color: 'var(--cg-text-primary)'
          }}
        >
          <div 
            className="px-4 py-3 flex justify-between items-center"
            style={{ 
              backgroundColor: 'var(--cg-surface-elevated)', 
              borderBottom: '1px solid var(--cg-border)' 
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="font-bold text-xs uppercase tracking-wider">DGMS System Alerts</h3>
            </div>
            {unreadCount > 0 ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                {unreadCount} new
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--cg-text-faint)] flex items-center gap-1">
                <CheckCheck className="w-3 h-3 text-emerald-400" /> Synced
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--cg-border)]">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--cg-text-muted)' }}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                No active pit alerts recorded.
              </div>
            ) : (
              alerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`p-3.5 flex gap-3 transition-colors ${
                    !alert.is_read 
                      ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div 
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      alert.severity === 'critical' 
                        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-ping' 
                        : alert.severity === 'high' 
                        ? 'bg-amber-400' 
                        : 'bg-emerald-400'
                    }`} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug mb-1" style={{ color: 'var(--cg-text-primary)' }}>
                      {alert.message}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>
                      {formatISTShort(alert.created_at)}
                    </p>
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
