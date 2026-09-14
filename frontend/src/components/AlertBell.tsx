import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Bell, CheckCheck, AlertCircle, ChevronRight, ExternalLink, ShieldAlert } from 'lucide-react';
import { formatISTShort } from '../lib/dateUtils';

export default function AlertBell() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  function playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
      // Quick, pleasant double-ding notification sound
      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      playTone(880, now, 0.2); // First ding (A5)
      playTone(1760, now + 0.15, 0.4); // Second higher ding (A6)
    } catch(e) {
      console.warn("Audio notification failed", e);
    }
  }

  useEffect(() => {
    fetchAlerts();

    const channel = supabase.channel('alerts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        setAlerts(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        playNotificationSound();
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
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);
        
      if (!error && data) {
        setAlerts(data);
        setUnreadCount(data.filter(a => !a.is_read).length);
      }
    } catch (err) {
      console.warn('Error fetching alerts:', err);
    }
  }

  function toggleMenu() {
    setIsOpen(prev => !prev);
  }

  async function markAllAsRead() {
    const unreadIds = alerts.filter(a => !a.is_read).map(a => a.id);
    if (unreadIds.length > 0) {
      await supabase.from('alerts').update({ is_read: true }).in('id', unreadIds);
      setUnreadCount(0);
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    }
  }

  function getAlertTarget(alert: any): string {
    const type = (alert.type || alert.related_entity_type || '').toLowerCase();
    const entityId = alert.related_entity_id;

    if (type === 'violation' || type === 'escalation' || type === 'hazard') {
      return entityId ? `/violations/${entityId}` : '/violations';
    }
    if (type === 'compliance' || type === 'overdue' || type === 'due_soon') {
      return '/compliance';
    }
    if (type === 'inspection') {
      return '/inspections';
    }

    // Inspect message text for intelligent routing
    const msg = (alert.message || '').toLowerCase();
    if (msg.includes('violation') || msg.includes('hazard') || msg.includes('safety') || msg.includes('corrective')) {
      return entityId ? `/violations/${entityId}` : '/violations';
    }
    if (msg.includes('compliance') || msg.includes('statutory') || msg.includes('regulation')) {
      return '/compliance';
    }
    if (msg.includes('inspection') || msg.includes('audit')) {
      return '/inspections';
    }

    return entityId ? `/violations/${entityId}` : '/violations';
  }

  async function handleAlertClick(alert: any, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Mark this specific alert as read if not already read
    if (!alert.is_read) {
      try {
        await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id);
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true } : a));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark alert as read:', err);
      }
    }

    setIsOpen(false);
    const destination = getAlertTarget(alert);
    navigate(destination);
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
          className="absolute right-0 mt-2 w-84 sm:w-96 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            backgroundColor: 'var(--cg-surface)', 
            border: '1px solid var(--cg-border-strong)',
            color: 'var(--cg-text-primary)'
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3 flex justify-between items-center"
            style={{ 
              backgroundColor: 'var(--cg-surface-elevated)', 
              borderBottom: '1px solid var(--cg-border)' 
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="font-bold text-xs uppercase tracking-wider">DGMS Statutory Alerts</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  Mark Read ({unreadCount})
                </button>
              ) : (
                <span className="text-[10px] font-mono text-[var(--cg-text-faint)] flex items-center gap-1">
                  <CheckCheck className="w-3 h-3 text-emerald-400" /> Synced
                </span>
              )}
            </div>
          </div>
          
          {/* List of alerts */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--cg-border)]">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--cg-text-muted)' }}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                No active pit alerts recorded.
              </div>
            ) : (
              alerts.map(alert => {
                const target = getAlertTarget(alert);
                const isCritical = alert.severity === 'critical' || alert.type === 'escalation';
                const isHigh = alert.severity === 'high';

                return (
                  <div 
                    key={alert.id} 
                    onClick={(e) => handleAlertClick(alert, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAlertClick(alert, e as any); }}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group text-left ${
                      !alert.is_read 
                        ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Severity Indicator Dot */}
                    <div 
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        isCritical 
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' 
                          : isHigh 
                          ? 'bg-amber-400' 
                          : 'bg-emerald-400'
                      }`} 
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold border ${
                          isCritical
                            ? 'bg-red-950/60 border-red-800 text-red-400'
                            : isHigh
                            ? 'bg-amber-950/60 border-amber-800 text-amber-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {alert.type || 'Alert'}
                        </span>
                        {alert.related_entity_id && (
                          <span className="text-[9px] font-mono text-slate-400">
                            #{alert.related_entity_id}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold leading-snug mb-1 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--cg-text-primary)' }}>
                        {alert.message}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>
                          {formatISTShort(alert.created_at)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400/80 group-hover:text-amber-400 flex items-center gap-0.5 transition-colors">
                          Open Details <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: View All Link */}
          <div 
            className="p-2.5 bg-slate-900/60 border-t flex items-center justify-between"
            style={{ 
              borderColor: 'var(--cg-border)',
              backgroundColor: 'var(--cg-surface-elevated)'
            }}
          >
            <Link
              to="/violations"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 px-3 rounded-lg text-center text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>View Full Violations & Alerts Registry</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
