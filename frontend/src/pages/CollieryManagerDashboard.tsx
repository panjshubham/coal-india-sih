import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { savePendingSubmission, getPendingCount } from '../services/db';
import {
  HardHat, Users, AlertTriangle, CheckCircle2, WifiOff, Wifi,
  MapPin, Camera, Mic, MicOff, Clock, ShieldAlert, Truck, ClipboardCheck,
  X, Send, ChevronDown, ChevronUp, Activity, FileText, DatabaseBackup, ShieldCheck,
  Flame, Gauge, Zap, Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SHIFT_DATA = [
  { shift: 'Morning', time: '06:00 – 14:00', foreman: 'Rajesh Kumar', workers: 142, status: 'active' },
  { shift: 'Afternoon', time: '14:00 – 22:00', foreman: 'Suresh Patel', workers: 118, status: 'upcoming' },
  { shift: 'Night', time: '22:00 – 06:00', foreman: 'Manoj Singh', workers: 97, status: 'upcoming' },
];

const CONTRACTOR_CHECKINS = [
  { name: 'RK Earthmovers', workers: 34, status: 'checked-in', time: '06:12 AM', cert: 'valid' },
  { name: 'Suvidha Drilling', workers: 18, status: 'checked-in', time: '06:45 AM', cert: 'valid' },
  { name: 'Bharat Explosives', workers: 8, status: 'pending', time: '--', cert: 'expiring' },
  { name: 'Ganesh Haulage', workers: 22, status: 'absent', time: '--', cert: 'valid' },
];

const CATEGORIES = ['Safety', 'Environmental', 'Structural', 'Electrical', 'Gas / Ventilation', 'Haulage', 'Other'];

// Tiny reusable status dot
function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

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
  const [formData, setFormData] = useState({ category: 'Safety', severity: 'medium', description: '', photo_url: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [violations, setViolations] = useState<any[]>([]);
  const [complianceItems, setComplianceItems] = useState<any[]>([]);
  const [time, setTime] = useState('');

  // Collapsible secondary sections
  const [showShifts, setShowShifts] = useState(true);
  const [showContractors, setShowContractors] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  // Live clock
  useEffect(() => {
    const tick = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false })), 1000);
    return () => clearInterval(tick);
  }, []);

  // Online/offline
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); refreshPending(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  async function refreshPending() { setPendingCount(await getPendingCount()); }

  useEffect(() => { refreshPending(); fetchData(); }, [user]);

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
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('done'); },
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
      if (newViolation) {
        await supabase.from('alerts').insert({
          type: 'violation', related_entity_id: newViolation.id, related_entity_type: 'violation',
          message: `New ${payload.severity} hazard reported in ${payload.category}.`,
          severity: payload.severity, is_read: false
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
    setCoords(null); setGpsStatus('idle');
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
  const severityDotColor: Record<string, string> = {
    low: 'bg-blue-500', medium: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-500'
  };

  // Derived counts for hero section
  const overdueCount = complianceItems.filter(c => c.status === 'overdue').length;
  const activeContractors = CONTRACTOR_CHECKINS.filter(c => c.status === 'checked-in').length;

  return (
    <div className="min-h-screen font-sans p-4 md:p-6 space-y-4" style={{ backgroundColor: 'var(--cg-bg)', color: 'var(--cg-text-primary)' }}>

      {/* ── TOP BAR: mine name + connection status ─────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {/* Single H1 for the page */}
          <h1 className="text-xl font-bold" style={{ color: 'var(--cg-text-primary)' }}>
            {mineName}
          </h1>
          <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--cg-text-muted)' }}>
            <Clock className="w-3.5 h-3.5" />
            {time || '--:--:--'} · Mine Manager Console
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Online / Offline pill */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {/* Pending queue badge */}
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300">
              <DatabaseBackup className="w-3 h-3" />
              {pendingCount} queued
            </span>
          )}
        </div>
      </div>

      {/* ── HERO: what matters right now ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Open violations — most urgent, highlighted */}
        <div className={`col-span-2 md:col-span-1 p-4 rounded-xl border-2 ${
          violations.length > 0
            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950/30'
            : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${violations.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className="text-xs font-semibold" style={{ color: 'var(--cg-text-muted)' }}>Open Violations</span>
          </div>
          <div className={`text-4xl font-black ${violations.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {violations.length}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--cg-text-muted)' }}>
            {violations.length === 0 ? 'All clear — no open issues' : 'Need your attention today'}
          </p>
        </div>

        {/* Workers on site */}
        <div className="p-4 rounded-xl border" style={{ background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--cg-text-muted)' }}>Workers on Site</span>
          </div>
          <div className="text-3xl font-black" style={{ color: 'var(--cg-text-primary)' }}>357</div>
          <p className="text-xs mt-1" style={{ color: 'var(--cg-text-muted)' }}>Across 3 shifts</p>
        </div>

        {/* Overdue compliance */}
        <div className={`p-4 rounded-xl border ${overdueCount > 0 ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20' : ''}`}
          style={overdueCount === 0 ? { background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' } : {}}>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className={`w-4 h-4 ${overdueCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-500'}`} />
            <span className="text-xs font-semibold" style={{ color: 'var(--cg-text-muted)' }}>Overdue Tasks</span>
          </div>
          <div className={`text-3xl font-black ${overdueCount > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}
            style={overdueCount === 0 ? { color: 'var(--cg-text-primary)' } : {}}>
            {overdueCount}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--cg-text-muted)' }}>Compliance items due</p>
        </div>

        {/* Contractors checked in */}
        <div className="p-4 rounded-xl border" style={{ background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-semibold" style={{ color: 'var(--cg-text-muted)' }}>Contractors In</span>
          </div>
          <div className="text-3xl font-black" style={{ color: 'var(--cg-text-primary)' }}>{activeContractors}</div>
          <p className="text-xs mt-1" style={{ color: 'var(--cg-text-muted)' }}>of {CONTRACTOR_CHECKINS.length} registered</p>
        </div>
      </div>

      {/* ── PRIMARY ACTION — single, prominent CTA ─────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <button
          id="report-hazard-btn"
          onClick={() => setShowHazardForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-red-200 dark:shadow-none"
        >
          <AlertTriangle className="w-4 h-4" />
          Report a Hazard
        </button>

        {/* Secondary actions — outlined, visually quieter */}
        <Link
          to="/inspections"
          className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
          style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' }}
        >
          <ClipboardCheck className="w-4 h-4" />
          Inspections
        </Link>
        <Link
          to="/statutory-registers"
          className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
          style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' }}
        >
          <ShieldCheck className="w-4 h-4" />
          CMR Registers
        </Link>
      </div>

      {/* ── OPEN VIOLATIONS: primary detail ────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--cg-border)' }}>
          <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--cg-text-primary)' }}>
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Open Violations
          </h2>
          <Link to="/violations" className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">
            View all →
          </Link>
        </div>
        {violations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--cg-text-muted)' }}>
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-semibold">No open violations — site is clear</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--cg-border)' }}>
            {violations.map(v => (
              <div key={v.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                {/* Severity dot */}
                <StatusDot color={severityDotColor[v.severity?.toLowerCase()] || 'bg-amber-500'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--cg-text-primary)' }}>
                    {v.description?.slice(0, 100)}{(v.description?.length ?? 0) > 100 ? '…' : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Severity badge with color */}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${severityColor[v.severity?.toLowerCase()] || severityColor.medium}`}>
                      {v.severity}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--cg-text-faint)' }}>
                      {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECONDARY DETAILS: collapsed by default ─────────────────── */}

      {/* Shift Schedule */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          onClick={() => setShowShifts(s => !s)}
          aria-expanded={showShifts}
        >
          <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--cg-text-primary)' }}>
            <Activity className="w-4 h-4 text-blue-500" />
            Shift Schedule
          </span>
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--cg-text-muted)' }}>
            <StatusDot color="bg-emerald-500" />
            Morning shift active
            {showShifts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        {showShifts && (
          <div className="divide-y border-t" style={{ borderColor: 'var(--cg-border)' }}>
            {SHIFT_DATA.map(s => (
              <div key={s.shift} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <StatusDot color={s.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} />
                  <span className="text-sm font-bold" style={{ color: 'var(--cg-text-primary)' }}>{s.shift}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--cg-text-muted)' }}>{s.time}</span>
                <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: 'var(--cg-text-secondary)' }}>
                  <span>{s.foreman}</span>
                  <span className="flex items-center gap-1 font-bold">
                    <Users className="w-3.5 h-3.5" />
                    {s.workers}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contractor Check-ins */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          onClick={() => setShowContractors(s => !s)}
          aria-expanded={showContractors}
        >
          <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--cg-text-primary)' }}>
            <Truck className="w-4 h-4 text-emerald-500" />
            Contractors Today
          </span>
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--cg-text-muted)' }}>
            {/* warning if any contractor has cert issue */}
            {CONTRACTOR_CHECKINS.some(c => c.cert === 'expiring') && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <StatusDot color="bg-amber-500" /> Cert issue
              </span>
            )}
            {activeContractors} of {CONTRACTOR_CHECKINS.length} checked in
            {showContractors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        {showContractors && (
          <div className="divide-y border-t" style={{ borderColor: 'var(--cg-border)' }}>
            {CONTRACTOR_CHECKINS.map(c => (
              <div key={c.name} className="flex items-center gap-3 px-5 py-3.5">
                <StatusDot color={
                  c.status === 'checked-in' ? 'bg-emerald-500' :
                  c.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                } />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--cg-text-primary)' }}>{c.name}</p>
                  {c.cert === 'expiring' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <ShieldAlert className="w-3 h-3" /> Safety cert expiring
                    </p>
                  )}
                </div>
                <div className="text-right text-xs shrink-0" style={{ color: 'var(--cg-text-muted)' }}>
                  <div className="font-bold" style={{ color: 'var(--cg-text-secondary)' }}>{c.workers} workers</div>
                  <div>{c.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compliance Tracker */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--cg-surface)', borderColor: 'var(--cg-border)' }}>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          onClick={() => setShowCompliance(s => !s)}
          aria-expanded={showCompliance}
        >
          <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--cg-text-primary)' }}>
            <FileText className="w-4 h-4 text-indigo-500" />
            Compliance Checklist
          </span>
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--cg-text-muted)' }}>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                <StatusDot color="bg-red-500" /> {overdueCount} overdue
              </span>
            )}
            {complianceItems.length} items tracked
            {showCompliance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        {showCompliance && (
          <div className="overflow-x-auto border-t" style={{ borderColor: 'var(--cg-border)' }}>
            {complianceItems.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--cg-text-muted)' }}>No compliance items loaded.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs font-bold uppercase" style={{ background: 'var(--cg-surface-elevated)', color: 'var(--cg-text-muted)', borderBottom: '1px solid var(--cg-border)' }}>
                    <th className="px-5 py-3">Requirement</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid var(--cg-border)' }}>
                      <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--cg-text-primary)' }}>
                        {item.directive_title || item.title || 'Statutory Requirement'}
                      </td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--cg-text-secondary)' }}>{item.category}</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--cg-text-secondary)' }}>{item.due_date || '--'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold ${statusColor(item.status)}`}>
                          <StatusDot color={
                            item.status === 'compliant' || item.status === 'completed' ? 'bg-emerald-500' :
                            item.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                          } />
                          {item.status === 'compliant' ? 'Compliant' :
                           item.status === 'overdue' ? 'Overdue' :
                           item.status === 'completed' ? 'Done' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── HAZARD REPORT MODAL ─────────────────────────────────────── */}
      {showHazardForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--cg-surface)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--cg-border)' }}>
              <div>
                <h2 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--cg-text-primary)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Report a Hazard
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--cg-text-muted)' }}>
                  {!isOnline ? '⚠️ Offline — will be queued and sent when connected' : 'Will be logged immediately and escalated'}
                </p>
              </div>
              <button
                onClick={() => { setShowHazardForm(false); resetForm(); }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                style={{ color: 'var(--cg-text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form fields */}
            <div className="p-5 space-y-5">

              {/* Category */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--cg-text-secondary)' }}>
                  Hazard Type
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm appearance-none pr-8"
                    style={{ background: 'var(--cg-surface-elevated)', border: '1px solid var(--cg-border-strong)', color: 'var(--cg-text-primary)' }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--cg-text-muted)' }} />
                </div>
              </div>

              {/* Severity — plain language labels */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--cg-text-secondary)' }}>
                  How serious is it?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'low', label: 'Low' },
                    { key: 'medium', label: 'Moderate' },
                    { key: 'high', label: 'High' },
                    { key: 'critical', label: 'Critical' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, severity: key }))}
                      className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                        formData.severity === key
                          ? severityColor[key]
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'var(--cg-text-secondary)' }}>
                  What happened? Where?
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Roof support cracked at Section B2, near the main ventilation shaft..."
                  className="w-full rounded-lg px-3 py-2.5 text-sm resize-none"
                  style={{ background: 'var(--cg-surface-elevated)', border: '1px solid var(--cg-border-strong)', color: 'var(--cg-text-primary)' }}
                />
              </div>

              {/* GPS + Voice — secondary tools */}
              <div className="flex gap-2">
                <button
                  id="capture-gps-btn"
                  type="button"
                  onClick={captureGPS}
                  disabled={gpsStatus === 'capturing'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    gpsStatus === 'done' ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' :
                    gpsStatus === 'error' ? 'border-red-300 text-red-700 bg-red-50' :
                    'hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                  style={gpsStatus === 'idle' ? { borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' } : {}}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {gpsStatus === 'idle' && 'Add Location'}
                  {gpsStatus === 'capturing' && 'Getting location...'}
                  {gpsStatus === 'done' && `${coords?.lat?.toFixed(4)}, ${coords?.lng?.toFixed(4)}`}
                  {gpsStatus === 'error' && 'GPS not available'}
                </button>
                <button
                  id="voice-log-btn"
                  type="button"
                  onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    isRecording
                      ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 animate-pulse'
                      : 'hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                  style={!isRecording ? { borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' } : {}}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isRecording ? 'Stop' : 'Voice'}
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor: 'var(--cg-border)', background: 'var(--cg-surface-elevated)' }}>
              <button
                type="button"
                onClick={() => { setShowHazardForm(false); resetForm(); }}
                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                style={{ borderColor: 'var(--cg-border)', color: 'var(--cg-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                id="submit-hazard-btn"
                type="button"
                onClick={submitHazard}
                disabled={submitStatus === 'submitting'}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  submitStatus === 'done'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                } disabled:opacity-60`}
              >
                {submitStatus === 'submitting' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitStatus === 'done' && <CheckCircle2 className="w-4 h-4" />}
                {submitStatus === 'idle' && <Send className="w-4 h-4" />}
                {submitStatus === 'idle' && (isOnline ? 'Submit Report' : 'Save for Later')}
                {submitStatus === 'submitting' && 'Submitting...'}
                {submitStatus === 'done' && 'Submitted!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
