// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { savePendingSubmission, getPendingCount } from '../services/db';
import {
  HardHat, Users, AlertTriangle, CheckCircle2, WifiOff, Wifi,
  MapPin, Camera, Mic, MicOff, Clock, ShieldAlert, Truck, ClipboardCheck,
  Plus, X, Send, ChevronDown, Activity, FileText
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN')), 1000);
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
      // Save offline — will sync when online
      await savePendingSubmission({ type: 'violation', data: payload });
      await refreshPending();
      setSubmitStatus('done');
      setTimeout(() => { setSubmitStatus('idle'); setShowHazardForm(false); resetForm(); }, 1500);
      return;
    }

    try {
      const { error } = await supabase.from('violations').insert(payload);
      if (error) throw error;
      setSubmitStatus('done');
      fetchData();
      setTimeout(() => { setSubmitStatus('idle'); setShowHazardForm(false); resetForm(); }, 1500);
    } catch (e) {
      console.error(e);
      // Fallback to offline queue
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
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  const statusColor = (s: string) => {
    if (s === 'compliant' || s === 'submitted') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (s === 'overdue') return 'text-red-400 bg-red-500/10 border-red-500/30';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HardHat className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--cg-text-primary)] tracking-tight">Colliery Manager</h1>
          </div>
          <p className="text-sm text-slate-400">{mineName} · <span className="font-mono">{time}</span></p>
        </div>
        <div className="flex items-center gap-3">
          {/* Offline indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline Mode'}
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} Pending Sync
            </div>
          )}
          <button
            id="report-hazard-btn"
            onClick={() => setShowHazardForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-500/30 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Hazard
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Workers On-Site', value: '357', icon: <Users className="w-5 h-5 text-blue-400" />, sub: '3 Active Shifts' },
          { label: 'Open Violations', value: String(violations.length), icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, sub: 'Requiring Action' },
          { label: 'Compliance Items', value: String(complianceItems.length), icon: <ClipboardCheck className="w-5 h-5 text-indigo-400" />, sub: 'Tracked This Month' },
          { label: 'Contractors Active', value: String(CONTRACTOR_CHECKINS.filter(c => c.status === 'checked-in').length), icon: <Truck className="w-5 h-5 text-emerald-400" />, sub: `of ${CONTRACTOR_CHECKINS.length} registered` },
        ].map(card => (
          <div key={card.label} className="bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              {card.icon}
            </div>
            <span className="text-3xl font-mono font-bold text-[var(--cg-text-primary)]">{card.value}</span>
            <span className="text-xs text-slate-500">{card.sub}</span>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Shift Schedules */}
        <div className="lg:col-span-1 bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-xl flex flex-col">
          <div className="p-4 border-b border-[var(--cg-border)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Shift Schedule</h3>
          </div>
          <div className="divide-y divide-[var(--cg-border)]">
            {SHIFT_DATA.map((s) => (
              <div key={s.shift} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">{s.shift}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${s.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-500 bg-slate-500/10 border-slate-600/30'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{s.foreman}</div>
                    <div className="text-xs text-slate-500">Shift Foreman</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-mono text-slate-300">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {s.workers}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Contractor Check-Ins */}
        <div className="lg:col-span-1 bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-xl flex flex-col">
          <div className="p-4 border-b border-[var(--cg-border)] flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Contractor Check-Ins</h3>
          </div>
          <div className="divide-y divide-[var(--cg-border)] flex-1">
            {CONTRACTOR_CHECKINS.map((c) => (
              <div key={c.name} className="p-3 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">{c.name}</span>
                  <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${c.status === 'checked-in' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : c.status === 'pending' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.workers} workers</span>
                  <span className="font-mono">{c.time}</span>
                </div>
                {c.cert === 'expiring' && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                    <ShieldAlert className="w-3 h-3" />
                    Safety cert expiring soon
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Open Violations */}
        <div className="lg:col-span-1 bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-xl flex flex-col">
          <div className="p-4 border-b border-[var(--cg-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Open Violations</h3>
            </div>
            <span className="text-xs text-slate-500">Live</span>
          </div>
          <div className="divide-y divide-[var(--cg-border)] flex-1 overflow-y-auto max-h-72">
            {violations.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                No open violations
              </div>
            )}
            {violations.map(v => (
              <div key={v.id} className="p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${severityColor[v.severity] || severityColor.medium}`}>{v.severity}</span>
                  <span className="text-[10px] font-mono text-slate-500">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">{v.description?.slice(0, 80)}{v.description?.length > 80 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="bg-[var(--cg-surface-elevated)] border border-[var(--cg-border)] rounded-xl flex flex-col">
        <div className="p-4 border-b border-[var(--cg-border)] flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Compliance Tracker</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--cg-surface-high)] text-xs text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--cg-border)]">
              {complianceItems.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No compliance items loaded.</td></tr>
              )}
              {complianceItems.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-200">{item.title}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize">{item.category}</td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-xs">{item.due_date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusColor(item.status)}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hazard Report Modal */}
      {showHazardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl w-full max-w-lg shadow-2xl shadow-red-900/30">
            <div className="flex items-center justify-between p-5 border-b border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="font-bold text-[var(--cg-text-primary)]">Report Field Hazard</h2>
                {!isOnline && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400">Offline — Will Sync</span>}
              </div>
              <button onClick={() => { setShowHazardForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-[var(--cg-surface-high)] border border-[var(--cg-border)] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500/50 appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Severity</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'critical'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setFormData(f => ({ ...f, severity: sev }))}
                      className={`py-2 rounded-lg border text-xs font-bold uppercase transition-all ${formData.severity === sev ? severityColor[sev] + ' ring-1 ring-current' : 'text-slate-500 border-slate-700 bg-transparent'}`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Hazard Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the hazard in detail..."
                  className="w-full bg-[var(--cg-surface-high)] border border-[var(--cg-border)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 resize-none"
                />
              </div>

              {/* GPS + Voice */}
              <div className="flex gap-2">
                <button
                  id="capture-gps-btn"
                  onClick={captureGPS}
                  disabled={gpsStatus === 'capturing'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold uppercase transition-all ${gpsStatus === 'done' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : gpsStatus === 'error' ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {gpsStatus === 'idle' && 'Capture GPS'}
                  {gpsStatus === 'capturing' && 'Locating...'}
                  {gpsStatus === 'done' && `${coords?.lat?.toFixed(4)}, ${coords?.lng?.toFixed(4)}`}
                  {gpsStatus === 'error' && 'GPS Error'}
                </button>
                <button
                  id="voice-log-btn"
                  onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold uppercase transition-all ${isRecording ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isRecording ? 'Stop' : 'Voice'}
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-[var(--cg-border)] flex gap-3">
              <button
                onClick={() => { setShowHazardForm(false); resetForm(); }}
                className="flex-1 py-2.5 rounded-lg border border-[var(--cg-border)] text-slate-400 text-sm font-bold hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                id="submit-hazard-btn"
                onClick={submitHazard}
                disabled={submitStatus === 'submitting'}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg ${submitStatus === 'done' ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'}`}
              >
                {submitStatus === 'submitting' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitStatus === 'done' && <CheckCircle2 className="w-4 h-4" />}
                {submitStatus === 'idle' && <Send className="w-4 h-4" />}
                {submitStatus === 'idle' && (!isOnline ? 'Queue Offline' : 'Submit Hazard')}
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
