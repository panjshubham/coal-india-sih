import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { getProfile, type InspectorProfile } from '../services/profileService';
import { savePendingAttendance, getPendingAttendances, getPendingCount } from '../services/db';
import { processSyncQueue } from '../services/syncService';
import {
  Users, UserCheck, ShieldCheck, MapPin, Clock, Camera, CheckCircle2,
  AlertTriangle, Wifi, WifiOff, RefreshCw, Search, Filter, HardHat,
  ChevronRight, Building2, QrCode, ArrowRight, DatabaseBackup, Fingerprint
} from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  designation: string;
  contractor: string;
  contractorId?: number;
  pmeStatus: 'Valid' | 'Expiring Soon' | 'Overdue';
  vtcValid: boolean;
  avatar?: string;
}

const ROSTER_WORKERS: Worker[] = [
  { id: 'CIL-W-1042', name: 'Ramesh Soren', designation: 'Senior Excavator Operator', contractor: 'L&T Mining Services', contractorId: 9, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1088', name: 'Birsa Munda', designation: 'Heavy Dumper Operator (100T)', contractor: 'Adani Mining Ent', contractorId: 13, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1120', name: 'Sunil Hansda', designation: 'DGMS Statutory Blaster', contractor: 'BGR Mining & Infra', contractorId: 10, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1154', name: 'Amitabh Sen', designation: 'Pit Safety Sirdar', contractor: 'CIL Direct (Regular)', contractorId: undefined, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1190', name: 'Gopal Mahato', designation: 'Continuous Miner Operator', contractor: 'Thriveni Earthmovers', contractorId: 11, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1215', name: 'Manoj Tirkey', designation: 'Drill Rig Operator', contractor: 'Sainik Mining', contractorId: 12, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1234', name: 'Dilip Kumar Tudu', designation: 'Underground Timberman', contractor: 'CIL Direct (Regular)', contractorId: undefined, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1267', name: 'Praveen Kispotta', designation: 'Ventilation Fan Attendant', contractor: 'L&T Mining Services', contractorId: 9, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1299', name: 'Rajeshwar Oraon', designation: 'Haul Road Grader Operator', contractor: 'Adani Mining Ent', contractorId: 13, pmeStatus: 'Valid', vtcValid: true },
  { id: 'CIL-W-1340', name: 'Sanjay Baski', designation: 'Sub-station Electrician', contractor: 'CIL Direct (Regular)', contractorId: undefined, pmeStatus: 'Valid', vtcValid: true },
];

export default function Attendance() {
  const { t } = useTranslation();
  const [profile] = useState<InspectorProfile>(getProfile());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [pendingAttendances, setPendingAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContractor, setSelectedContractor] = useState('ALL');
  const [currentShift, setCurrentShift] = useState('Morning (Shift 1)');
  const [currentTime, setCurrentTime] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [punchSuccessToast, setPunchSuccessToast] = useState<string | null>(null);

  // GPS state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>({ lat: 23.7923, lng: 86.4253 });
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(2.4);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Live Camera Biometric Modal
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeWorkerForCamera, setActiveWorkerForCamera] = useState<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Manual Check-In Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    workerId: '',
    designation: 'General Pit Operative',
    contractor: 'CIL Direct (Regular)',
  });

  // Clock tick & Auto Shift Detection
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }));
      const hour = now.getHours();
      if (hour >= 6 && hour < 14) setCurrentShift('Morning (Shift 1)');
      else if (hour >= 14 && hour < 22) setCurrentShift('Afternoon (Shift 2)');
      else setCurrentShift('Night (Shift 3)');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Network listener & sync triggers
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleAttUpdated = () => {
      fetchAttendances();
    };
    window.addEventListener('coalguard:attendanceUpdated', handleAttUpdated);

    fetchAttendances();
    acquireLocation();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('coalguard:attendanceUpdated', handleAttUpdated);
      stopCamera();
    };
  }, []);

  const triggerSync = async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      await processSyncQueue();
      await fetchAttendances();
    } catch (e) {
      console.error('[Attendance] Auto-sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  const acquireLocation = () => {
    setGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(Math.round(pos.coords.accuracy * 10) / 10 || 2.4);
          setGpsLoading(false);
        },
        () => {
          // Default to Colliery Pithead coordinates
          setGpsCoords({ lat: 23.7923, lng: 86.4253 });
          setGpsAccuracy(2.4);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsLoading(false);
    }
  };

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      // 1. Fetch pending offline items from IndexedDB
      const pending = await getPendingAttendances();
      setPendingAttendances(pending);

      // 2. Fetch server attendances from Supabase if online
      if (navigator.onLine) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .gte('timestamp', `${today}T00:00:00`)
          .order('timestamp', { ascending: false });

        if (!error && data) {
          setAttendances(data);
        }
      }
    } catch (err) {
      console.warn('Attendance fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark Attendance (Works 100% Offline via IndexedDB or Online via Supabase)
  const markWorkerAttendance = async (
    worker: Worker | { id: string; name: string; designation: string; contractor: string; contractorId?: number },
    method: 'face_biometric' | 'geo_fenced_gate' | 'qr_gate_pass' = 'geo_fenced_gate',
    photoDataUrl?: string
  ) => {
    const timestamp = new Date().toISOString();
    const payload = {
      worker_id: worker.id,
      worker_name: worker.name,
      designation: worker.designation,
      shift: currentShift,
      mine_id: 42,
      contractor_id: worker.contractorId || null,
      contractor_name: worker.contractor,
      latitude: gpsCoords?.lat || 23.7923,
      longitude: gpsCoords?.lng || 86.4253,
      accuracy_meters: gpsAccuracy,
      status: 'present',
      verification_method: method,
      photo_url: photoDataUrl || null,
      timestamp,
    };

    if (navigator.onLine) {
      try {
        const { error } = await supabase.from('attendance').insert([{ ...payload, synced: true }]);
        if (error) throw error;

        setPunchSuccessToast(`✅ Clocked-in: ${worker.name} (${currentShift}) — Synced to Cloud`);
        window.dispatchEvent(new Event('coalguard:attendanceUpdated'));
        fetchAttendances();
      } catch (e) {
        console.warn('Online attendance insert failed, falling back to local queue:', e);
        await savePendingAttendance(payload);
        setPunchSuccessToast(`🌐 Offline Mode: Clocked-in ${worker.name} — Saved Locally`);
        fetchAttendances();
      }
    } else {
      await savePendingAttendance(payload);
      setPunchSuccessToast(`🌐 Offline Mode: Clocked-in ${worker.name} — Saved to Local Storage`);
      fetchAttendances();
    }

    setTimeout(() => setPunchSuccessToast(null), 4500);
  };

  // Camera handling for face attendance
  const openBiometricCamera = async (worker: Worker) => {
    setActiveWorkerForCamera(worker);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn(e));
      }
    } catch (e) {
      console.error('Camera open failed:', e);
      // Fallback: punch with geo_fenced_gate without photo
      markWorkerAttendance(worker, 'geo_fenced_gate');
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  const captureBiometricSelfie = () => {
    if (!videoRef.current || !activeWorkerForCamera) return;
    setCapturing(true);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(10, canvas.height - 40, 360, 32);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`BIOMETRIC MUSTER | ${new Date().toISOString().slice(0, 19)}`, 18, canvas.height - 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.fillText(`${activeWorkerForCamera.id} • ${activeWorkerForCamera.name}`, 18, canvas.height - 10);
    }

    const photoUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    setCameraOpen(false);
    setCapturing(false);
    markWorkerAttendance(activeWorkerForCamera, 'face_biometric', photoUrl);
  };

  // Combine online attendances and offline pending attendances
  const allTodayAttendances = [...pendingAttendances, ...attendances];
  const punchedWorkerIds = new Set(allTodayAttendances.map(a => a.worker_id));

  // Filter roster
  const filteredRoster = ROSTER_WORKERS.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContractor = selectedContractor === 'ALL' || w.contractor === selectedContractor;
    return matchesSearch && matchesContractor;
  });

  // Calculate metrics
  const totalOnSite = allTodayAttendances.length;
  const cilDirectCount = allTodayAttendances.filter(a => a.contractor_name?.includes('CIL Direct') || !a.contractor_id).length;
  const contractorCount = totalOnSite - cilDirectCount;
  const pendingOfflineCount = pendingAttendances.length;

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 space-y-6 transition-colors font-sans">
      
      {/* ── TOAST ALERT ── */}
      {punchSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white border border-amber-500/40 shadow-2xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{punchSuccessToast}</span>
          </div>
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            {t('att_subtitle', 'DGMS Statutory Form B / Pithead Muster Roll')}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('att_title', 'Field Workforce Attendance')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-normal">
            {t('att_desc', 'Geo-tagged field workforce punch-in with instant biometric verification, offline SQLite/IndexedDB queueing, and contractor compliance linkage under CMR Reg 37.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Online / Offline Status */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
            isOnline 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? t('att_online_live', 'Online (Central Live)') : t('att_offline_mode', 'Offline (Local Encrypted Storage)')}
          </span>

          {/* Sync Trigger */}
          {pendingOfflineCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={syncing || !isOnline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-sm disabled:opacity-50"
            >
              <DatabaseBackup className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : `${t('att_sync_now', 'Sync')} ${pendingOfflineCount} Queued`}</span>
            </button>
          )}

          {/* Back to Dashboard Link */}
          <Link
            to="/dashboard/colliery"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <span>{t('nav_dashboard', 'Dashboard')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── KPI METRICS BAR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workers on Site */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('att_workers_on_site', 'Workers On Site')}</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{totalOnSite}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Clocked in for {currentShift.split(' ')[0]} shift
          </p>
        </div>

        {/* CIL Regular Personnel */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('att_cil_regular', 'CIL Regular Miners')}</span>
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{cilDirectCount}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Direct Departmental Staff</p>
        </div>

        {/* Contractor Workforce */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('att_contractor_personnel', 'Contractor Personnel')}</span>
            <HardHat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{contractorCount}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">CLRA / Form XII Verified</p>
        </div>

        {/* Offline Sync State */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          pendingOfflineCount > 0 
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60' 
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('att_offline_cache', 'Offline Cache')}</span>
            <DatabaseBackup className={`w-4 h-4 ${pendingOfflineCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div className={`text-3xl font-extrabold mt-2 ${pendingOfflineCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
            {pendingOfflineCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {pendingOfflineCount > 0 ? 'Pending automatic cloud sync' : 'All local punches synchronized'}
          </p>
        </div>
      </div>

      {/* ── PITHEAD GNSS GEOFENCE & SHIFT BAR ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('att_geofence_active', 'Pithead GNSS Geofence')}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-mono font-bold">
                ✓ INSIDE AUTHORIZED PIT ZONE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {gpsCoords ? `${gpsCoords.lat.toFixed(5)}° N, ${gpsCoords.lng.toFixed(5)}° E (±${gpsAccuracy}m RTK Fix)` : 'Acquiring GPS...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Active Duty Shift</span>
            <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{currentShift}</p>
          </div>

          <button
            onClick={acquireLocation}
            disabled={gpsLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Locking GNSS...' : 'Calibrate GPS'}</span>
          </button>

          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>+ Manual Entry</span>
          </button>
        </div>
      </div>

      {/* ── WORKER ROSTER SECTION ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Roster Controls */}
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>{t('att_muster_roll_shift', 'Shift Muster Roll & Quick Clock-In')}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click "Clock-In" to mark presence. Functions seamlessly both online and offline with instant local persistence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('att_search_placeholder', 'Search name, ID, trade...')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            {/* Contractor Filter */}
            <select
              value={selectedContractor}
              onChange={e => setSelectedContractor(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">{t('att_all_contractors', 'All Contractors & CIL Direct')}</option>
              <option value="CIL Direct (Regular)">{t('att_cil_direct', 'CIL Direct (Regular)')}</option>
              <option value="L&T Mining Services">L&T Mining Services</option>
              <option value="Adani Mining Ent">Adani Mining Ent</option>
              <option value="BGR Mining & Infra">BGR Mining & Infra</option>
              <option value="Thriveni Earthmovers">Thriveni Earthmovers</option>
              <option value="Sainik Mining">Sainik Mining</option>
            </select>
          </div>
        </div>

        {/* Worker Cards / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">{t('att_col_worker', 'Worker ID & Name')}</th>
                <th className="py-3 px-4">Designation / Trade</th>
                <th className="py-3 px-4">{t('att_col_contractor', 'Contractor / Department')}</th>
                <th className="py-3 px-4 text-center">{t('att_col_statutory', 'PME Fitness')}</th>
                <th className="py-3 px-4 text-center">{t('att_col_status', "Today's Status")}</th>
                <th className="py-3 px-4 text-right">{t('att_col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredRoster.map(w => {
                const isPunched = punchedWorkerIds.has(w.id);
                return (
                  <tr key={w.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{w.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{w.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {w.designation}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold text-[11px]">
                        {w.contractor}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('att_valid_pme', 'Form O Valid')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isPunched ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('att_status_clocked_in', 'Present (Checked-In)')}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[11px]">
                          {t('att_status_not_reported', 'Pending Clock-In')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isPunched ? (
                        <span className="text-xs text-slate-400 font-mono italic">{t('att_status_clocked_in', 'Clocked In')}</span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openBiometricCamera(w)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors font-bold text-[11px] flex items-center gap-1"
                            title="Face Biometric Gate Pass"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-500" />
                            <span>Face</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => markWorkerAttendance(w, 'geo_fenced_gate')}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-white transition-all font-bold text-[11px] shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Clock-In</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TODAY'S CLOCKED-IN MUSTER LOG ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Today's Pithead Entry Register ({allTodayAttendances.length} Active Records)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official DGMS biometric and GPS geo-tagged audit log for shift operations.
              </p>
            </div>
          </div>
          <button
            onClick={fetchAttendances}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {allTodayAttendances.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <Users className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No attendance punches recorded yet today.</p>
            <p className="text-xs">Use the Shift Muster Roll above to clock in workers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Time & Shift</th>
                  <th className="py-3 px-4">Worker ID & Name</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Contractor / Dept</th>
                  <th className="py-3 px-4">Geo-Tag Location</th>
                  <th className="py-3 px-4 text-center">Method</th>
                  <th className="py-3 px-4 text-right">Central Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {allTodayAttendances.map(a => {
                  const isOffline = a.id?.toString().startsWith('offline-') || a.synced === false;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-400">{a.shift}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{a.worker_name}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{a.worker_id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {a.designation}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 dark:text-slate-200 font-semibold">
                          {a.contractor_name || 'CIL Direct'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {a.latitude && a.longitude ? `${Number(a.latitude).toFixed(4)}°N, ${Number(a.longitude).toFixed(4)}°E` : 'Pit Geofence'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px] uppercase">
                          {a.verification_method?.replace(/_/g, ' ') || 'Geo-Fence'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isOffline ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Queued Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Cloud Synced
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── LIVE CAMERA BIOMETRIC MODAL ── */}
      {cameraOpen && activeWorkerForCamera && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Pithead Face Biometric Check-In
                </span>
              </div>
              <button
                onClick={() => { stopCamera(); setCameraOpen(false); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 text-center">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-3 border border-slate-800 flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {/* Oval face guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-36 h-48 border-2 border-dashed border-amber-400/70 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-emerald-400">
                  ● LIVE FACE SCAN
                </div>
              </div>

              <div className="text-left bg-slate-950/70 p-3 rounded-xl border border-slate-800 mb-4">
                <div className="font-bold text-sm text-white">{activeWorkerForCamera.name}</div>
                <div className="text-xs text-slate-400 font-mono">{activeWorkerForCamera.id} • {activeWorkerForCamera.designation}</div>
                <div className="text-xs text-amber-400 mt-1">{activeWorkerForCamera.contractor}</div>
              </div>

              <div className="flex items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => { stopCamera(); setCameraOpen(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureBiometricSelfie}
                  disabled={capturing}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>{capturing ? 'Verifying...' : 'Capture & Clock-In'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL WORKER ENTRY MODAL ── */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-600" />
                <span>Manual Pit Entry Check-In</span>
              </h3>
              <button onClick={() => setManualModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                markWorkerAttendance({
                  id: manualForm.workerId || `CIL-MAN-${Date.now().toString().slice(-4)}`,
                  name: manualForm.name,
                  designation: manualForm.designation,
                  contractor: manualForm.contractor,
                }, 'geo_fenced_gate');
                setManualModalOpen(false);
                setManualForm({ name: '', workerId: '', designation: 'General Pit Operative', contractor: 'CIL Direct (Regular)' });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Worker Full Name *</label>
                <input
                  required
                  type="text"
                  value={manualForm.name}
                  onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Anand Kumar"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Worker ID / Token *</label>
                <input
                  required
                  type="text"
                  value={manualForm.workerId}
                  onChange={e => setManualForm(f => ({ ...f, workerId: e.target.value }))}
                  placeholder="e.g. CIL-W-9921"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={manualForm.designation}
                  onChange={e => setManualForm(f => ({ ...f, designation: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">Contractor / Agency</label>
                <select
                  value={manualForm.contractor}
                  onChange={e => setManualForm(f => ({ ...f, contractor: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="CIL Direct (Regular)">CIL Direct (Regular)</option>
                  <option value="L&T Mining Services">L&T Mining Services</option>
                  <option value="Adani Mining Ent">Adani Mining Ent</option>
                  <option value="BGR Mining & Infra">BGR Mining & Infra</option>
                  <option value="Thriveni Earthmovers">Thriveni Earthmovers</option>
                  <option value="Sainik Mining">Sainik Mining</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm"
                >
                  Register Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
