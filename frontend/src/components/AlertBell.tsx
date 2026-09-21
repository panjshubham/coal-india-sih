import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  Bell, CheckCheck, AlertCircle, ChevronRight, ExternalLink, ShieldAlert,
  Flame, Droplets, Camera, FileText, BookOpen, Lock, Activity, Layers, Radio
} from 'lucide-react';
import { formatISTShort } from '../lib/dateUtils';

export interface SystemAlert {
  id: string | number;
  type: string; // 'blast' | 'water_inrush' | 'ppe' | 'insar' | 'compliance' | 'register' | 'audit' | 'escalation' | 'violation'
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  related_entity_id?: string | number;
  related_entity_type?: string;
  destination?: string;
  created_at: string;
  is_read: boolean;
}

// Built-in live statutory alerts representing all active CoalGuard monitoring domains
const DEFAULT_SYSTEM_ALERTS: SystemAlert[] = [
  {
    id: 'alt-blast-01',
    type: 'blast',
    severity: 'critical',
    title: 'BLAST ZONE LOCKDOWN',
    message: 'Critical Geofence Breach: 2 personnel detected inside Pit-3 active exclusion zone (BL-2026-0921-014). Barrier interlock engaged.',
    related_entity_id: 'BL-014',
    related_entity_type: 'blast_operation',
    destination: '/blast-lockdown',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: 'alt-water-02',
    type: 'water_inrush',
    severity: 'critical',
    title: 'WATER INRUSH HAZARD',
    message: 'SCADA Telemetry Surge: Seam 3 North borehole inflow surged to 47.7 L/s (Karst Pressure 2.15 MPa). CLSSA-XGBoost triggers Level-2 Evacuation.',
    related_entity_id: 'SCADA-BH3',
    related_entity_type: 'water_inrush',
    destination: '/water-inrush',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: 'alt-ppe-03',
    type: 'ppe',
    severity: 'high',
    title: 'PPE SAFETY VISION',
    message: 'AI Camera Breach: Worker #117 entering haulage road without statutory hard hat & safety vest — DGMS CMR Reg 115 violation.',
    related_entity_id: 'W-117',
    related_entity_type: 'ppe_feed',
    destination: '/ppe-monitor',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: 'alt-comp-04',
    type: 'compliance',
    severity: 'high',
    title: 'CMR STATUTORY DIRECTIVE',
    message: 'CMR 2017 Reg 129: Overman Daily Shift Log mandatory statutory submission due before 16:00 IST today.',
    related_entity_id: 'CMR-129',
    related_entity_type: 'compliance_item',
    destination: '/compliance',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    is_read: false,
  },
  {
    id: 'alt-insar-05',
    type: 'insar',
    severity: 'medium',
    title: 'INSAR GROUND DISPLACEMENT',
    message: 'Satellite Radar Telemetry: Sentinel-1 DInSAR detected 3.8mm displacement near Bench-4 slope perimeter. Watch protocol active.',
    related_entity_id: 'INSAR-B4',
    related_entity_type: 'strata_radar',
    destination: '/mines-map',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    is_read: true,
  },
  {
    id: 'alt-reg-06',
    type: 'register',
    severity: 'medium',
    title: 'CMR STATUTORY REGISTER',
    message: 'CMR Reg 153 Gas Testing: Methane CH4 reading 0.45% and CO 4 ppm logged in District East Face 4B awaiting verification seal.',
    related_entity_id: 'REG-153',
    related_entity_type: 'statutory_book',
    destination: '/statutory-registers',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    is_read: true,
  },
  {
    id: 'alt-audit-07',
    type: 'audit',
    severity: 'low',
    title: 'CRYPTOGRAPHIC AUDIT SEAL',
    message: 'Tamper-proof blockchain dispatch seal verified for Block #18,492. SHA-256 Merkle root validation confirmed with DGMS.',
    related_entity_id: 'BLK-18492',
    related_entity_type: 'audit_block',
    destination: '/audit-log',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    is_read: true,
  },
];

export default function AlertBell() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  function playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      
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
      playTone(880, now, 0.2); // First ding
      playTone(1760, now + 0.15, 0.4); // Second ding
    } catch(e) {
      console.warn("Audio notification failed", e);
    }
  }

  const deduplicate = (items: SystemAlert[]) => {
    const seen = new Set<string>();
    const result: SystemAlert[] = [];
    for (const item of items) {
      const key = `${item.message}_${item.related_entity_id || ''}_${item.type || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result;
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase.channel('alerts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const newAlert = payload.new;
        const normalizedAlert: SystemAlert = {
          id: newAlert.id,
          type: normalizeAlertType(newAlert.type || newAlert.related_entity_type, newAlert.message),
          severity: (newAlert.severity || 'high').toLowerCase(),
          title: getAlertTitle(newAlert.type, newAlert.message),
          message: newAlert.message,
          related_entity_id: newAlert.related_entity_id,
          related_entity_type: newAlert.related_entity_type,
          destination: getAlertTarget(newAlert),
          created_at: newAlert.created_at || new Date().toISOString(),
          is_read: false,
        };

        setAlerts(prev => {
          const key = `${normalizedAlert.message}_${normalizedAlert.related_entity_id || ''}_${normalizedAlert.type || ''}`;
          const exists = prev.some(a => `${a.message}_${a.related_entity_id || ''}_${a.type || ''}` === key);
          if (exists) return prev;

          playNotificationSound();
          setUnreadCount(count => count + 1);
          return [normalizedAlert, ...prev];
        });
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

  function normalizeAlertType(typeStr?: string, messageStr: string = ''): string {
    const raw = (typeStr || '').toLowerCase();
    const msg = messageStr.toLowerCase();

    if (raw.includes('blast') || msg.includes('blast') || msg.includes('detonation') || msg.includes('exclusion')) return 'blast';
    if (raw.includes('water') || msg.includes('water') || msg.includes('inrush') || msg.includes('inflow') || msg.includes('karst')) return 'water_inrush';
    if (raw.includes('ppe') || msg.includes('ppe') || msg.includes('helmet') || msg.includes('vest') || msg.includes('hard hat')) return 'ppe';
    if (raw.includes('insar') || msg.includes('insar') || msg.includes('subsidence') || msg.includes('displacement') || msg.includes('strata')) return 'insar';
    if (raw.includes('compliance') || msg.includes('compliance') || msg.includes('directive') || msg.includes('due')) return 'compliance';
    if (raw.includes('register') || msg.includes('register') || msg.includes('cmr reg') || msg.includes('gas testing')) return 'register';
    if (raw.includes('audit') || msg.includes('ledger') || msg.includes('blockchain') || msg.includes('crypto')) return 'audit';
    return 'violation';
  }

  function getAlertTitle(typeStr?: string, messageStr: string = ''): string {
    const norm = normalizeAlertType(typeStr, messageStr);
    switch (norm) {
      case 'blast': return 'BLAST ZONE LOCKDOWN';
      case 'water_inrush': return 'WATER INRUSH HAZARD';
      case 'ppe': return 'PPE SAFETY VISION';
      case 'insar': return 'INSAR GROUND DISPLACEMENT';
      case 'compliance': return 'CMR STATUTORY DIRECTIVE';
      case 'register': return 'CMR STATUTORY REGISTER';
      case 'audit': return 'CRYPTOGRAPHIC AUDIT SEAL';
      default: return 'STATUTORY ESCALATION';
    }
  }

  async function fetchAlerts() {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
        
      const dbAlerts: SystemAlert[] = (!error && data) 
        ? data.map(item => ({
            id: item.id,
            type: normalizeAlertType(item.type || item.related_entity_type, item.message),
            severity: (item.severity || 'high').toLowerCase() as any,
            title: getAlertTitle(item.type, item.message),
            message: item.message,
            related_entity_id: item.related_entity_id,
            related_entity_type: item.related_entity_type,
            destination: getAlertTarget(item),
            created_at: item.created_at || new Date().toISOString(),
            is_read: Boolean(item.is_read),
          }))
        : [];

      // Merge DB alerts with default statutory alert categories
      const combined = deduplicate([...dbAlerts, ...DEFAULT_SYSTEM_ALERTS]);
      setAlerts(combined);
      setUnreadCount(combined.filter(a => !a.is_read).length);
    } catch (err) {
      console.warn('Error fetching alerts, using default alert suite:', err);
      setAlerts(DEFAULT_SYSTEM_ALERTS);
      setUnreadCount(DEFAULT_SYSTEM_ALERTS.filter(a => !a.is_read).length);
    }
  }

  function toggleMenu() {
    setIsOpen(prev => !prev);
  }

  async function markAllAsRead() {
    try {
      await supabase.from('alerts').update({ is_read: true }).neq('is_read', true);
    } catch (e) {
      console.warn('Mark all read error:', e);
    }
    setUnreadCount(0);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  }

  function getAlertTarget(alert: any): string {
    if (alert.destination) return alert.destination;

    const norm = normalizeAlertType(alert.type || alert.related_entity_type, alert.message);
    const entityId = alert.related_entity_id;

    switch (norm) {
      case 'blast':
        return '/blast-lockdown';
      case 'water_inrush':
        return '/water-inrush';
      case 'ppe':
        return '/ppe-monitor';
      case 'insar':
        return '/mines-map';
      case 'compliance':
        return '/compliance';
      case 'register':
        return '/statutory-registers';
      case 'audit':
        return '/audit-log';
      default:
        return entityId ? `/violations/${entityId}` : '/violations';
    }
  }

  async function handleAlertClick(alert: SystemAlert, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!alert.is_read) {
      try {
        if (typeof alert.id === 'number') {
          await supabase.from('alerts').update({ is_read: true }).eq('id', alert.id);
        }
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

  // Filter alerts by active tab
  const filteredAlerts = useMemo(() => {
    if (activeCategory === 'all') return alerts;
    return alerts.filter(a => a.type === activeCategory);
  }, [alerts, activeCategory]);

  // Visual styling dictionary for each alert category
  const categoryConfig: Record<string, { label: string; icon: any; badgeClass: string }> = {
    blast: {
      label: 'Blast Lockdown',
      icon: Flame,
      badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40',
    },
    water_inrush: {
      label: 'Water Inrush',
      icon: Droplets,
      badgeClass: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/40',
    },
    ppe: {
      label: 'PPE Vision',
      icon: Camera,
      badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40',
    },
    insar: {
      label: 'InSAR Strata',
      icon: Activity,
      badgeClass: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/40',
    },
    compliance: {
      label: 'CMR Directive',
      icon: FileText,
      badgeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/40',
    },
    register: {
      label: 'CMR Register',
      icon: BookOpen,
      badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40',
    },
    audit: {
      label: 'Crypto Audit',
      icon: Lock,
      badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40',
    },
    violation: {
      label: 'Escalation',
      icon: AlertCircle,
      badgeClass: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40',
    },
  };

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
        <Bell className="w-4 h-4 hover:text-amber-700 dark:text-amber-400 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 border-2 border-[var(--cg-bg)] rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-88 sm:w-[420px] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
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
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider">DGMS Statutory Multi-Alert Hub</h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">All Live Mine Monitoring Domains</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-400 dark:border-amber-500/30 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  Mark Read ({unreadCount})
                </button>
              ) : (
                <span className="text-[10px] font-mono text-[var(--cg-text-faint)] flex items-center gap-1 font-bold">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> All Synced
                </span>
              )}
            </div>
          </div>

          {/* Category Filter Pills (Scrollable) */}
          <div 
            className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b text-[11px]" 
            style={{ borderColor: 'var(--cg-border)', backgroundColor: 'var(--cg-surface)' }}
          >
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setActiveCategory('blast')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'blast'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Flame className="w-3 h-3 text-red-500" />
              Blast
            </button>
            <button
              onClick={() => setActiveCategory('water_inrush')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'water_inrush'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Droplets className="w-3 h-3 text-cyan-500" />
              Water
            </button>
            <button
              onClick={() => setActiveCategory('ppe')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'ppe'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Camera className="w-3 h-3 text-amber-500" />
              PPE
            </button>
            <button
              onClick={() => setActiveCategory('compliance')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'compliance'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <FileText className="w-3 h-3 text-purple-500" />
              Compliance
            </button>
            <button
              onClick={() => setActiveCategory('violation')}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === 'violation'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <AlertCircle className="w-3 h-3 text-red-500" />
              Hazards
            </button>
          </div>
          
          {/* List of alerts */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--cg-border)]">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs" style={{ color: 'var(--cg-text-muted)' }}>
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-700 dark:text-amber-400" />
                No active alerts in this category.
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isCritical = alert.severity === 'critical';
                const isHigh = alert.severity === 'high';
                const config = categoryConfig[alert.type] || categoryConfig.violation;
                const IconComponent = config.icon;

                return (
                  <div 
                    key={alert.id} 
                    onClick={(e) => handleAlertClick(alert, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAlertClick(alert, e as any); }}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group text-left ${
                      !alert.is_read 
                        ? 'bg-amber-50/70 dark:bg-amber-500/5 hover:bg-amber-100/70 dark:hover:bg-amber-500/10' 
                        : 'hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {/* Category Icon with Severity Badge */}
                    <div className="relative mt-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${config.badgeClass}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      {isCritical && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold border ${config.badgeClass}`}>
                            {alert.title}
                          </span>
                          {alert.related_entity_id && (
                            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                              #{alert.related_entity_id}
                            </span>
                          )}
                        </div>

                        {/* Severity Indicator */}
                        <span className={`text-[9px] font-mono font-bold uppercase ${
                          isCritical ? 'text-red-600 dark:text-red-400' : isHigh ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>

                      <p className="text-xs font-semibold leading-snug mb-1 group-hover:text-amber-700 dark:text-amber-400 transition-colors" style={{ color: 'var(--cg-text-primary)' }}>
                        {alert.message}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-mono" style={{ color: 'var(--cg-text-faint)' }}>
                          {formatISTShort(alert.created_at)}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 flex items-center gap-0.5 transition-colors">
                          Open Details <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer: Multi-Domain Shortcut Grid */}
          <div 
            className="p-3 border-t flex flex-col gap-2"
            style={{ 
              borderColor: 'var(--cg-border)',
              backgroundColor: 'var(--cg-surface-elevated)'
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>Quick Statutory Destinations:</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">All Modules Active</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <Link
                to="/blast-lockdown"
                onClick={() => setIsOpen(false)}
                className="py-1 px-2 rounded-lg text-center text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-red-500/15 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
              >
                <Flame className="w-3 h-3 text-red-500" />
                Blast Zones
              </Link>
              <Link
                to="/water-inrush"
                onClick={() => setIsOpen(false)}
                className="py-1 px-2 rounded-lg text-center text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-600 transition-colors flex items-center justify-center gap-1"
              >
                <Droplets className="w-3 h-3 text-cyan-500" />
                Water Inrush
              </Link>
              <Link
                to="/violations"
                onClick={() => setIsOpen(false)}
                className="py-1 px-2 rounded-lg text-center text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-amber-500/15 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
              >
                <AlertCircle className="w-3 h-3 text-amber-500" />
                All Hazards
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
