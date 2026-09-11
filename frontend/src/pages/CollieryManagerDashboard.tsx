import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { savePendingSubmission, getPendingCount } from '../services/db';
import {
  HardHat, Users, AlertTriangle, CheckCircle2, WifiOff, Wifi,
  MapPin, Camera, Mic, MicOff, Clock, ShieldAlert, Truck, ClipboardCheck,
  X, Send, ChevronDown, Activity, FileText, DatabaseBackup
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
      const { error } = await supabase.from('violations').insert(payload);
      if (error) throw error;
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
    low: 'text-blue-400 bg-blue-950/80 border-blue-800',
    medium: 'text-amber-400 bg-amber-950/80 border-amber-800',
    high: 'text-orange-400 bg-orange-950/80 border-orange-800',
    critical: 'text-red-400 bg-red-950/80 border-red-800',
  };

  const statusColor = (s: string) => {
    if (s === 'compliant' || s === 'completed') return 'text-emerald-400 bg-emerald-950/80 border-emerald-800';
    if (s === 'overdue') return 'text-red-400 bg-red-950/80 border-red-800';
    return 'text-amber-400 bg-amber-950/80 border-amber-800';
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 font-sans p-6">

      {/* 1. Header with Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">MINISTRY OF COAL / OPERATIONS / COLLIERY MANAGEMENT</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Colliery Manager Console
            <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              {mineName}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            LOCAL TIME: <span className="text-slate-200">{time}</span> (UTC+05:30)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Offline/Online Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider font-mono ${isOnline ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' : 'bg-red-950/60 border-red-500/40 text-red-400 animate-pulse'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Network Online' : 'OFFLINE MODE'}
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 text-xs font-bold font-mono">
              <DatabaseBackup className="w-3.5 h-3.5" />
              {pendingCount} Q'd
            </div>
          )}

          <button
            id="report-hazard-btn"
            onClick={() => setShowHazardForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition shadow-lg shadow-red-600/20"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> REPORT HAZARD
          </button>
        </div>
      </div>

      {/* 2. KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { label: 'Workers On-Site', value: '357', icon: <Users className="w-4 h-4 text-blue-400" />, sub: '3 Active Shifts' },
          { label: 'Open Violations', value: String(violations.length), icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, sub: 'Requiring Action' },
          { label: 'Compliance Items', value: String(complianceItems.length), icon: <ClipboardCheck className="w-4 h-4 text-indigo-400" />, sub: 'Tracked This Month' },
          { label: 'Contractors Active', value: String(CONTRACTOR_CHECKINS.filter(c => c.status === 'checked-in').length), icon: <Truck className="w-4 h-4 text-emerald-400" />, sub: `of ${CONTRACTOR_CHECKINS.length} registered` },
        ].map(card => (
          <div key={card.label} className="p-4 bg-[#0B1326] border border-slate-800 rounded-xl">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono text-slate-400 uppercase">{card.label}</span>
              {card.icon}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{card.value}</span>
              <span className="text-[10px] text-slate-500 font-mono">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

        {/* Left: Shift Schedules */}
        <div className="lg:col-span-1 bg-[#0B1326] border border-slate-800 rounded-xl flex flex-col shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Shift Schedule</h3>
          </div>
          <div className="divide-y divide-slate-800/60">
            {SHIFT_DATA.map((s) => (
              <div key={s.shift} className="p-4 flex flex-col gap-2 hover:bg-slate-900/40 transition">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">{s.shift}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border font-mono tracking-wider ${s.status === 'active' ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' : 'text-slate-400 bg-slate-900/60 border-slate-800'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-200">{s.foreman}</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Shift Foreman</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 font-bold bg-cyan-950/30 px-2 py-1 rounded border border-cyan-800/50">
                    <Users className="w-3.5 h-3.5" />
                    {s.workers} MINERS
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Contractor Check-Ins */}
        <div className="lg:col-span-1 bg-[#0B1326] border border-slate-800 rounded-xl flex flex-col shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Contractor Manifest</h3>
          </div>
          <div className="divide-y divide-slate-800/60 flex-1">
            {CONTRACTOR_CHECKINS.map((c) => (
              <div key={c.name} className="p-3.5 flex flex-col gap-2 hover:bg-slate-900/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200 leading-tight">{c.name}</span>
                  <span className={`shrink-0 text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded border ${c.status === 'checked-in' ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' : c.status === 'pending' ? 'text-amber-400 bg-amber-950/60 border-amber-800' : 'text-red-400 bg-red-950/60 border-red-800'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.workers} WORKERS</span>
                  <span>{c.time}</span>
                </div>
                {c.cert === 'expiring' && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-medium">
                    <ShieldAlert className="w-3 h-3" />
                    SAFETY CERT EXPIRING SOON
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Open Violations */}
        <div className="lg:col-span-1 bg-[#0B1326] border border-slate-800 rounded-xl flex flex-col shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Open Hazards</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-800/60 flex-1 overflow-y-auto max-h-80">
            {violations.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                NO OPEN HAZARDS
              </div>
            )}
            {violations.map(v => (
              <div key={v.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-900/40 transition relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${v.severity === 'Critical' || v.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div className="flex items-center justify-between ml-2">
                  <span className={`text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 rounded border ${severityColor[v.severity] || severityColor.medium}`}>{v.severity}</span>
                  <span className="text-[9px] font-mono text-slate-500">{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-slate-300 ml-2 font-medium">{v.description?.slice(0, 80)}{v.description?.length > 80 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Compliance Table */}
      <div className="bg-[#0B1326] border border-slate-800 rounded-xl flex flex-col mt-6 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-200">Colliery Compliance Tracker</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/80 font-mono text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Directive / Requirement</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {complianceItems.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No compliance items loaded.</td></tr>
              )}
              {complianceItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition">
                  <td className="px-5 py-3 font-sans font-bold text-slate-200">{item.title}</td>
                  <td className="px-5 py-3 text-slate-400 capitalize">{item.category}</td>
                  <td className="px-5 py-3 text-slate-400">{item.due_date}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${statusColor(item.status)}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hazard Report Modal (Offline First Design) */}
      {showHazardForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070D18]/90 backdrop-blur-sm p-4 font-sans">
          <div className="bg-[#0B1326] border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-900/80 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">Report Field Hazard</h2>
              </div>
              <div className="flex items-center gap-3">
                {!isOnline && <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400 animate-pulse">OFFLINE: QUEUING</span>}
                <button onClick={() => { setShowHazardForm(false); resetForm(); }} className="text-slate-500 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Category */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5">Hazard Category</label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500/50 appearance-none font-mono"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5">Severity Index</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'critical'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setFormData(f => ({ ...f, severity: sev }))}
                      className={`py-1.5 rounded border text-[10px] font-bold uppercase transition-all font-mono ${formData.severity === sev ? severityColor[sev] : 'text-slate-500 border-slate-800 bg-slate-900/50 hover:bg-slate-900'}`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5">Incident Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detail the hazard location and nature..."
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 resize-none font-mono"
                />
              </div>

              {/* GPS + Voice */}
              <div className="flex gap-2">
                <button
                  id="capture-gps-btn"
                  onClick={captureGPS}
                  disabled={gpsStatus === 'capturing'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border text-[10px] font-bold font-mono uppercase transition-all ${gpsStatus === 'done' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : gpsStatus === 'error' ? 'bg-red-950/60 border-red-800 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  <MapPin className="w-3 h-3" />
                  {gpsStatus === 'idle' && 'Tag Location'}
                  {gpsStatus === 'capturing' && 'Acquiring...'}
                  {gpsStatus === 'done' && `${coords?.lat?.toFixed(4)}, ${coords?.lng?.toFixed(4)}`}
                  {gpsStatus === 'error' && 'GPS Error'}
                </button>
                <button
                  id="voice-log-btn"
                  onClick={() => setIsRecording(r => !r)}
                  className={`flex items-center gap-2 px-4 py-2 rounded border text-[10px] font-bold font-mono uppercase transition-all ${isRecording ? 'bg-red-950/60 border-red-800 text-red-400 animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  {isRecording ? 'Stop' : 'Voice Memo'}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-3">
              <button
                onClick={() => { setShowHazardForm(false); resetForm(); }}
                className="flex-1 py-2 rounded border border-slate-700 text-slate-400 text-xs font-bold font-mono hover:text-white transition"
              >
                CANCEL
              </button>
              <button
                id="submit-hazard-btn"
                onClick={submitHazard}
                disabled={submitStatus === 'submitting'}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold font-mono uppercase transition-all ${submitStatus === 'done' ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
              >
                {submitStatus === 'submitting' && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitStatus === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {submitStatus === 'idle' && <Send className="w-3.5 h-3.5" />}
                {submitStatus === 'idle' && (!isOnline ? 'QUEUE OFFLINE' : 'TRANSMIT LOG')}
                {submitStatus === 'submitting' && 'TRANSMITTING...'}
                {submitStatus === 'done' && 'LOGGED'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
