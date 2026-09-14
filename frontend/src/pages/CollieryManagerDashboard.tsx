import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { savePendingSubmission, getPendingCount } from '../services/db';
import {
  HardHat, Users, AlertTriangle, CheckCircle2, WifiOff, Wifi,
  MapPin, Camera, Mic, MicOff, Clock, ShieldAlert, Truck, ClipboardCheck,
  X, Send, ChevronDown, Activity, FileText, DatabaseBackup, ShieldCheck,
  Flame, Gauge, Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SHIFT_DATA = [
  { shift: 'Morning (06:00 - 14:00)', foreman: 'Rajesh Kumar', workers: 142, status: 'active' },
  { shift: 'Afternoon (14:00 - 22:00)', foreman: 'Suresh Patel', workers: 118, status: 'upcoming' },
  { shift: 'Night (22:00 - 06:00)', foreman: 'Manoj Singh', workers: 97, status: 'upcoming' },
];

const CONTRACTOR_CHECKINS = [
  { name: 'M/s RK Earthmovers Pvt Ltd', workers: 34, status: 'checked-in', time: '06:12 AM', cert: 'valid' },
  { name: 'M/s Suvidha Drilling Co.', workers: 18, status: 'checked-in', time: '06:45 AM', cert: 'valid' },
  { name: 'M/s Bharat Explosives', workers: 8, status: 'pending', time: '--', cert: 'expiring' },
  { name: 'M/s Ganesh Haulage', workers: 22, status: 'absent', time: '--', cert: 'valid' },
];

const CATEGORIES = ['Safety', 'Environmental', 'Structural', 'Electrical', 'Gas / Ventilation', 'Haulage', 'Other'];

export default function CollieryManagerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mineName, setMineName] = useState('Loading...');
  const [mineId, setMineId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'capturing' | 'done' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Safety',
    severity: 'medium',
    description: '',
    photo_url: '',
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [violations, setViolations] = useState<any[]>([]);
  const [complianceItems, setComplianceItems] = useState<any[]>([]);
  const [time, setTime] = useState('');

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);

  // Online/offline
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); refreshPending(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  async function refreshPending() {
    setPendingCount(await getPendingCount());
  }

  useEffect(() => {
    refreshPending();
    fetchData();
  }, [user]);

  async function fetchData() {
    if (!user) return;
    try {
      const { data: userData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
      const id = userData?.assigned_mine_id || 1;
      setMineId(id);

      const { data: mineData } = await supabase.from('mines').select('name').eq('id', id).single();
      if (mineData) setMineName(mineData.name);

      const { data: vData } = await supabase.from('violations').select('*').eq('mine_id', id).eq('status', 'open').order('created_at', { ascending: false }).limit(5);
      if (vData) setViolations(vData);

      const { data: cData } = await supabase.from('compliance_items').select('*').eq('mine_id', id).order('due_date', { ascending: true }).limit(6);
      if (cData) setComplianceItems(cData);
    } catch (e) { console.error(e); }
  }

  function captureGPS() {
    setGpsStatus('capturing');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('done');
      },
      () => setGpsStatus('error'),
      { timeout: 8000 }
    );
  }

  async function submitHazard() {
    if (!formData.description.trim()) return alert('Please describe the hazard.');
    setSubmitStatus('submitting');

    const payload = {
      mine_id: mineId || 1,
      category: formData.category.toLowerCase(),
      severity: formData.severity,
      description: formData.description,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
      status: 'open',
      timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      await savePendingSubmission({ type: 'violation', data: payload });
      await refreshPending();
      setSubmitStatus('done');
      setTimeout(() => { setSubmitStatus('idle'); setShowHazardForm(false); resetForm(); }, 1500);
      return;
    }

    try {
      const { data: newViolation, error } = await supabase.from('violations').insert(payload).select().single();
      if (error) throw error;
      
      // Auto-generate an alert for the newly created violation
      if (newViolation) {
        await supabase.from('alerts').insert({
          type: 'violation',
          related_entity_id: newViolation.id,
          related_entity_type: 'violation',
          message: `New ${payload.severity} hazard reported in ${payload.category}.`,
          severity: payload.severity,
          is_read: false
        });
      }

      setSubmitStatus('done');
      fetchData();
      setTimeout(() => { setSubmitStatus('idle'); setShowHazardForm(false); resetForm(); }, 1500);
    } catch (e) {
      console.error(e);
      await savePendingSubmission({ type: 'violation', data: payload });
      await refreshPending();
      setSubmitStatus('done');
      setTimeout(() => { setSubmitStatus('idle'); setShowHazardForm(false); resetForm(); }, 1500);
    }
  }

  function resetForm() {
    setFormData({ category: 'Safety', severity: 'medium', description: '', photo_url: '' });
    setCoords(null);
    setGpsStatus('idle');
  }

  const severityColor: Record<string, string> = {
    low: 'text-blue-800 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800',
    medium: 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800',
    high: 'text-orange-800 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/80 border-orange-200 dark:border-orange-800',
    critical: 'text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800',
  };

  const statusColor = (s: string) => {
    if (s === 'compliant' || s === 'completed') return 'text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800';
    if (s === 'overdue') return 'text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800';
    return 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-6">

      {/* 1. Header with Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-slate-800 dark:text-slate-500 uppercase tracking-widest">{t('cm_header_ministry', 'MINISTRY OF COAL / OPERATIONS / COLLIERY MANAGEMENT')}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            {t('cm_dashboard_title', 'Colliery Manager Console')}
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded bg-slate-100 dark:bg-blue-950 text-slate-800 dark:text-blue-400 border border-slate-300 dark:border-blue-800">
              {mineName}
            </span>
          </h1>
          <p className="text-xs text-slate-800 dark:text-slate-500 mt-1 font-mono">
            {t('cm_local_time', 'LOCAL TIME')}: <span className="text-slate-800 dark:text-slate-200 font-bold">{time}</span> (UTC+05:30)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Offline/Online Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider font-mono ${isOnline ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-400 animate-pulse'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? t('cm_network_online', 'Network Online') : t('cm_network_offline', 'OFFLINE MODE')}
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-400 text-xs font-bold font-mono">
              <DatabaseBackup className="w-3.5 h-3.5" />
              {pendingCount} {t('cm_queued', "Q'd")}
            </div>
          )}

          <Link
            to="/inspections"
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition border border-slate-300 dark:border-slate-700 shadow-sm"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" /> {t('btn_inspections', 'INSPECTIONS')}
          </Link>

          <Link
            to="/statutory-registers"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> {t('btn_cmr_registers', 'CMR STATUTORY REGISTERS')}
          </Link>

          <button
            id="report-hazard-btn"
            onClick={() => setShowHazardForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white font-bold text-xs rounded-lg transition shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> {t('btn_report_hazard', 'REPORT HAZARD')}
          </button>
        </div>
      </div>

      {/* 2. KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { label: t('metric_workers', 'Workers On-Site'), value: '357', icon: <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />, sub: t('metric_workers_sub', '3 Active Shifts') },
          { label: t('metric_violations', 'Open Violations'), value: String(violations.length), icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />, sub: t('metric_violations_sub', 'Requiring Action') },
          { label: t('metric_compliance', 'Compliance Items'), value: String(complianceItems.length), icon: <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, sub: t('metric_compliance_sub', 'Tracked This Month') },
          { label: t('metric_contractors', 'Contractors Active'), value: String(CONTRACTOR_CHECKINS.filter(c => c.status === 'checked-in').length), icon: <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />, sub: t('metric_contractors_sub', 'of {{total}} registered', { total: CONTRACTOR_CHECKINS.length }) },
        ].map(card => (
          <div key={card.label} className="p-4 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-slate-800 dark:text-slate-500 uppercase">{card.label}</span>
              {card.icon}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</span>
              <span className="text-[10px] text-slate-700 dark:text-slate-500 font-mono">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left: Shift Schedules */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-200">{t('section_shift_schedule', 'Shift Schedule')}</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {SHIFT_DATA.map((s) => (
              <div key={s.shift} className="p-4 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-white dark:bg-slate-900/40 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-800 dark:text-slate-500">{s.shift}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border font-mono tracking-wider ${s.status === 'active' ? 'text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-200">{s.foreman}</div>
                    <div className="text-[10px] font-mono text-slate-700 dark:text-slate-500 uppercase">{t('cm_shift_foreman', 'Shift Foreman')}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-blue-700 dark:text-cyan-400 font-bold bg-blue-50 dark:bg-cyan-950/30 px-2 py-1 rounded border border-blue-200 dark:border-cyan-800/50">
                    <Users className="w-3.5 h-3.5" />
                    {s.workers} {t('cm_miners', 'MINERS')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Contractor Check-Ins */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-200">{t('section_contractor_manifest', 'Contractor Manifest')}</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
            {CONTRACTOR_CHECKINS.map((c) => (
              <div key={c.name} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-white dark:bg-slate-900/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-tight">{c.name}</span>
                  <span className={`shrink-0 text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${c.status === 'checked-in' ? 'text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' : c.status === 'pending' ? 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' : 'text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-700 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.workers} {t('cm_workers', 'WORKERS')}</span>
                  <span>{c.time}</span>
                </div>
                {c.cert === 'expiring' && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-amber-700 dark:text-amber-400 font-medium">
                    <ShieldAlert className="w-3 h-3" />
                    {t('cm_cert_expiring', 'SAFETY CERT EXPIRING SOON')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Open Violations */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-200">{t('section_open_hazards', 'Open Hazards')}</h3>
            </div>
            <Link to="/violations" className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline">
              {t('cm_violations_link', 'Violations & Sync &rarr;')}
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1 overflow-y-auto max-h-80">
            {violations.length === 0 && (
              <div className="p-6 text-center text-slate-700 dark:text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-500/50" />
                {t('cm_no_hazards', 'NO OPEN HAZARDS')}
              </div>
            )}
            {violations.map(v => (
              <div key={v.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50 dark:hover:bg-white dark:bg-slate-900/40 transition relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${v.severity === 'Critical' || v.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="flex items-center justify-between ml-2">
                  <span className={`text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 rounded border ${severityColor[v.severity] || severityColor.medium}`}>{v.severity}</span>
                  <span className="text-[9px] font-mono text-slate-700 dark:text-slate-500">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-300 ml-2 font-medium">{v.description?.slice(0, 80)}{v.description?.length > 80 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Compliance Table */}
      <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col mt-6 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-200">{t('section_compliance_tracker', 'Colliery Compliance Tracker')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/80 font-mono text-slate-700 dark:text-slate-400 uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">{t('table_col_directive', 'Directive / Requirement')}</th>
                <th className="px-5 py-3">{t('table_col_category', 'Category')}</th>
                <th className="px-5 py-3">{t('table_col_due_date', 'Due Date')}</th>
                <th className="px-5 py-3">{t('table_col_status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {complianceItems.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-700 dark:text-slate-500">No compliance items loaded.</td></tr>
              )}
              {complianceItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white dark:bg-slate-900/40 transition">
                  <td className="px-5 py-3.5 font-sans font-medium text-slate-900 dark:text-slate-200">{item.directive_title || item.title || 'Statutory Requirement'}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{item.category}</td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{item.due_date || '--'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hazard Report Modal (Offline First Design) */}
      {showHazardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950/70 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">{t('modal_report_hazard', 'Report Field Hazard')}</h2>
              </div>
              <div className="flex items-center gap-3">
                {!isOnline && <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-400 animate-pulse">{t('cm_offline_queuing', 'OFFLINE: QUEUING')}</span>}
                <button onClick={() => { setShowHazardForm(false); resetForm(); }} className="text-slate-700 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Category */}
              <div>
                <label className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1.5">{t('form_label_category', 'Hazard Category')}</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-red-500 appearance-none font-mono"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1.5">{t('form_label_severity', 'Severity Index')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'critical'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setFormData(f => ({ ...f, severity: sev }))}
                      className={`py-1.5 rounded border text-[10px] font-bold uppercase transition-all font-mono ${formData.severity === sev ? severityColor[sev] : 'text-slate-600 dark:text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-white dark:bg-slate-900'}`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-widest block mb-1.5">{t('form_label_description', 'Incident Description')}</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detail the hazard location and nature..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500 resize-none font-mono"
                />
              </div>

              {/* GPS + Voice */}
              <div className="flex gap-2">
                <button
                  id="capture-gps-btn"
                  onClick={captureGPS}
                  disabled={gpsStatus === 'capturing'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border text-[10px] font-bold font-mono uppercase transition-all ${gpsStatus === 'done' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' : gpsStatus === 'error' ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:text-slate-800 dark:text-slate-200'}`}
                >
                  <MapPin className="w-3 h-3" />
                  {gpsStatus === 'idle' && t('form_btn_tag_location', 'Tag Location')}
                  {gpsStatus === 'capturing' && t('form_btn_acquiring', 'Acquiring...')}
                  {gpsStatus === 'done' && `${coords?.lat?.toFixed(4)}, ${coords?.lng?.toFixed(4)}`}
                  {gpsStatus === 'error' && t('form_btn_gps_error', 'GPS Error')}
                </button>
                <button
                  id="voice-log-btn"
                  onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-2 px-4 py-2 rounded border text-[10px] font-bold font-mono uppercase transition-all ${isRecording ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:text-slate-800 dark:text-slate-200'}`}
                >
                  {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  {isRecording ? t('form_btn_stop', 'Stop') : t('form_btn_voice_memo', 'Voice Memo')}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
              <button
                onClick={() => { setShowHazardForm(false); resetForm(); }}
                className="flex-1 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 text-xs font-bold font-mono hover:bg-slate-100 dark:hover:text-slate-900 dark:text-white transition"
              >
                {t('form_btn_cancel', 'CANCEL')}
              </button>
              <button
                id="submit-hazard-btn"
                onClick={submitHazard}
                disabled={submitStatus === 'submitting'}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold font-mono uppercase transition-all ${submitStatus === 'done' ? 'bg-emerald-600 text-slate-900 dark:text-white' : 'bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white shadow-sm'}`}
              >
                {submitStatus === 'submitting' && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitStatus === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {submitStatus === 'idle' && <Send className="w-3.5 h-3.5" />}
                {submitStatus === 'idle' && (!isOnline ? t('form_btn_queue_offline', 'QUEUE OFFLINE') : t('form_btn_transmit', 'TRANSMIT LOG'))}
                {submitStatus === 'submitting' && t('form_btn_transmitting', 'TRANSMITTING...')}
                {submitStatus === 'done' && t('form_btn_logged', 'LOGGED')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
