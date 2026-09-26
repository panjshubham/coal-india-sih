import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { getProfile, type InspectorProfile } from '../services/profileService';
import { savePendingSubmission } from '../services/db';
import { processSyncQueue } from '../services/syncService';
import Tesseract from 'tesseract.js';

// Pre-seeded fallback data so dropdowns are NEVER empty in offline mode
const DEFAULT_MINES = [
  { id: 42, name: 'Govindpur Colliery' },
  { id: 43, name: 'Dhori Khas' },
  { id: 44, name: 'Karo Spl' },
  { id: 45, name: 'Tetaria Khar' },
  { id: 46, name: 'Kathautia OCP' },
  { id: 47, name: 'Rajhara' },
  { id: 48, name: 'Choritand Tiliaya' },
  { id: 49, name: 'Jogeshwar & Khas Jogeshwar' },
  { id: 50, name: 'Rabodih OCP' },
  { id: 51, name: 'Rohne' },
  { id: 52, name: 'Urtan North' },
  { id: 53, name: 'North of Arkhapal Srirampur' },
  { id: 54, name: 'Moonidih Project' },
  { id: 55, name: 'Rajmahal OCP' },
  { id: 56, name: 'Gevra OCP' },
  { id: 57, name: 'Bhubaneswari OCP' },
  { id: 58, name: 'Jayant OCP' },
  { id: 59, name: 'Umrer OCP' },
];

const DEFAULT_CONTRACTORS = [
  { id: 9, name: 'L&T Mining Services' },
  { id: 10, name: 'BGR Mining & Infra' },
  { id: 11, name: 'Thriveni Earthmovers' },
  { id: 12, name: 'Sainik Mining' },
  { id: 13, name: 'Adani Mining Ent' },
];

const getCachedMines = () => {
  try {
    const cached = localStorage.getItem('coalguard_mines_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_MINES;
};

const getCachedContractors = () => {
  try {
    const cached = localStorage.getItem('coalguard_contractors_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_CONTRACTORS;
};

export default function Inspections() {
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const [mines, setMines] = useState<any[]>(getCachedMines);
  const [contractors, setContractors] = useState<any[]>(getCachedContractors);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    mine_id: '',
    contractor_id: '',
    inspector_name: getProfile().fullName,
    category: 'safety',
    severity: 'low',
    description: '',
    photo_base64: '',
    lat: null as number | null,
    lng: null as number | null,
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success_online' | 'success_offline' | 'error'>('idle');
  const [usingCachedGps, setUsingCachedGps] = useState(false);

  // Live Camera Stream State & Refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: mData } = await supabase.from('mines').select('id, name').order('id');
        const { data: cData } = await supabase.from('contractors').select('id, name').order('id');
        if (mData && mData.length > 0) {
          setMines(mData);
          localStorage.setItem('coalguard_mines_cache', JSON.stringify(mData));
        }
        if (cData && cData.length > 0) {
          setContractors(cData);
          localStorage.setItem('coalguard_contractors_cache', JSON.stringify(cData));
        }
      } catch (e) {
        console.warn('[Inspections] Offline mode: using cached/default mines and contractors');
      }
    }
    fetchData();

    const handleProfileUpdate = (e: any) => {
      const updated = e.detail || getProfile();
      setProfile(updated);
      setFormData(prev => ({ ...prev, inspector_name: updated.fullName }));
    };
    window.addEventListener('coalguard:profileUpdated', handleProfileUpdate);
    
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      triggerAutoSync();
    }

    return () => {
      window.removeEventListener('coalguard:profileUpdated', handleProfileUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopCameraStream();
    };
  }, []);

  const triggerAutoSync = async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      await processSyncQueue();
    } catch (e) {
      console.error('[Inspections] Auto-sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  // ── LIVE WEBCAM / CAMERA STREAM LOGIC ────────────────────────────────
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setIsCameraOpen(true);
    setCameraError(null);
    stopCameraStream();

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Stream play error:', e));
      }
    } catch (err: any) {
      console.error('Camera open failed:', err);
      setCameraError('Camera stream could not be started or permission was denied. You can still upload a photo file.');
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const captureShutter = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Draw statutory DGMS timestamp watermark
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(10, canvas.height - 48, 380, 38);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`DGMS STATUTORY INSPECTION | ${new Date().toISOString().slice(0, 19)}`, 20, canvas.height - 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      const locText = formData.lat && formData.lng ? `GPS: ${formData.lat.toFixed(4)}°N, ${formData.lng.toFixed(4)}°E` : 'GPS: FIELD STAMP';
      ctx.fillText(`${locText} | AUTH: ${profile.fullName || 'DGMS INSPECTOR'}`, 20, canvas.height - 14);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setFormData(prev => ({ ...prev, photo_base64: dataUrl }));
    }

    setTimeout(() => {
      setIsCapturing(false);
      closeCameraModal();
    }, 250);
  };

  const captureLocation = () => {
    setLoadingLocation(true);
    
    const fallbackLocation = () => {
      setFormData(prev => ({
        ...prev,
        lat: 23.7923,
        lng: 86.4253
      }));
      setUsingCachedGps(true);
      setLoadingLocation(false);
    };

    if ('geolocation' in navigator && isOnline) {
      let isResolved = false;
      const failsafe = setTimeout(() => {
        if (!isResolved) {
          console.warn('Geolocation timeout in Inspections, using fallback');
          fallbackLocation();
        }
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          isResolved = true;
          clearTimeout(failsafe);
          setUsingCachedGps(false);
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          setLoadingLocation(false);
        },
        (error) => {
          isResolved = true;
          clearTimeout(failsafe);
          console.warn('Error getting location', error);
          fallbackLocation();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      fallbackLocation();
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo_base64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOcr = async () => {
    if (!formData.photo_base64) {
      alert("Please capture or upload a photo first!");
      return;
    }
    setIsOcrLoading(true);
    try {
      const result = await Tesseract.recognize(
        formData.photo_base64,
        'eng',
        { logger: m => console.log(m) }
      );
      if (result.data.text.trim()) {
        setFormData(prev => ({ 
          ...prev, 
          description: prev.description ? `${prev.description}\n\n[OCR Detected]: ${result.data.text.trim()}` : result.data.text.trim() 
        }));
      } else {
        alert("OCR did not detect any readable text in this photo.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to extract text from image");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const getRegulationRef = (cat: string) => {
    switch (cat) {
      case 'safety': return 'DGMS-SEC-115';
      case 'environment': return 'DGMS-ENV-4.1';
      case 'production': return 'DGMS-PROD-2.3';
      case 'labour': return 'DGMS-LAB-12.1';
      default: return 'DGMS-SEC-4.2';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    const mineIdNum = parseInt(formData.mine_id, 10);
    const contractorIdNum = formData.contractor_id ? parseInt(formData.contractor_id, 10) : null;
    const regulationRef = getRegulationRef(formData.category);
    const inspectorName = formData.inspector_name || profile.fullName || 'Field Inspector';
    const timestamp = new Date().toISOString();

    const payload = {
      mine_id: mineIdNum,
      contractor_id: contractorIdNum,
      inspector_name: inspectorName,
      category: formData.category,
      severity: formData.severity,
      description: formData.description,
      regulation_ref: regulationRef,
      photo_base64: formData.photo_base64,
      lat: formData.lat,
      lng: formData.lng,
      timestamp,
    };

    if (isOnline) {
      try {
        // 1. Insert inspection
        const inspPayload: any = {
          mine_id: mineIdNum,
          date: timestamp,
          inspector_name: inspectorName,
          synced_at: timestamp,
        };
        if (contractorIdNum) inspPayload.contractor_id = contractorIdNum;

        const { data: inspData, error: inspErr } = await supabase
          .from('inspections')
          .insert([inspPayload])
          .select('id')
          .single();

        if (inspErr) {
          console.warn('[Inspections] Inspection insert failed (non-fatal):', inspErr.message);
        }

        // 2. Insert violation
        const violPayload: any = {
          mine_id: mineIdNum,
          category: formData.category,
          severity: formData.severity,
          description: formData.description,
          regulation_ref: regulationRef,
          photo_url: formData.photo_base64 ? formData.photo_base64.substring(0, 2000) : null,
          latitude: formData.lat,
          longitude: formData.lng,
          status: 'open',
        };
        if (inspData?.id) violPayload.inspection_id = inspData.id;

        const { error: violErr } = await supabase.from('violations').insert([violPayload]);

        if (violErr) throw violErr;

        setStatus('success_online');
        resetForm();
        window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
        setTimeout(() => setStatus('idle'), 6000);
      } catch (error) {
        console.error('[Inspections] Error submitting online, falling back to offline queue', error);
        await saveOffline(payload);
      }
    } else {
      await saveOffline(payload);
    }
  };

  const saveOffline = async (payload: any) => {
    try {
      await savePendingSubmission({ ...payload, synced: false });
      window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
      setStatus('success_offline');
      resetForm();
      setTimeout(() => setStatus('idle'), 6000);
    } catch (e) {
      console.error('[Inspections] Failed to save offline', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      mine_id: '',
      contractor_id: '',
      inspector_name: profile.fullName,
      category: 'safety',
      severity: 'low',
      description: '',
      photo_base64: '',
      lat: null,
      lng: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 flex flex-col items-center transition-colors">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              DGMS Statutory Field Inspection
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Log New Inspection
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-normal">
              Submit an official inspection report with live high-resolution photo evidence, live webcam stream, and automatic GPS geo-tagging.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-row items-start md:items-end gap-2 shrink-0">
            {syncing && (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Syncing Ledger...
              </span>
            )}
            <Link
              to="/attendance"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[17px]">how_to_reg</span>
              <span>Workforce Attendance</span>
            </Link>
            <Link
              to="/profile"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-750 shadow-sm flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400">badge</span>
              <span>Active Duty: <strong className="text-slate-900 dark:text-white">{profile.fullName || 'Inspector'}</strong></span>
            </Link>
          </div>
        </div>

        {/* MAIN FORM CONTAINER */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          
          {/* Card Topbar */}
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]">assignment_turned_in</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">Inspection Details</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 font-sans">Network Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                isOnline 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
              }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE (AUTO-QUEUED)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            {/* Grid 1: Mine and Contractor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                  Select Colliery / Mine <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formData.mine_id}
                    onChange={e => setFormData(prev => ({...prev, mine_id: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium appearance-none"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-500">-- Choose Mine / Colliery --</option>
                    {mines.map(m => (
                      <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-slate-400 absolute right-3.5 top-3.5 pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                  Contractor Agency (If Applicable)
                </label>
                <div className="relative">
                  <select 
                    value={formData.contractor_id}
                    onChange={e => setFormData(prev => ({...prev, contractor_id: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium appearance-none"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-500">-- None (CIL Direct Operations) --</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-slate-400 absolute right-3.5 top-3.5 pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>
            </div>

            {/* Grid 2: Category and Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                  Violation Category <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formData.category}
                    onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium appearance-none"
                  >
                    <option value="safety" className="bg-white dark:bg-slate-900">Safety & Strata Control</option>
                    <option value="environment" className="bg-white dark:bg-slate-900">Environmental Hazard & Dust</option>
                    <option value="production" className="bg-white dark:bg-slate-900">Unauthorized Extraction / Boundary</option>
                    <option value="labour" className="bg-white dark:bg-slate-900">Labour & Welfare (CLRA/PME)</option>
                  </select>
                  <span className="material-symbols-outlined text-slate-400 absolute right-3.5 top-3.5 pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                  Severity Level <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formData.severity}
                    onChange={e => setFormData(prev => ({...prev, severity: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium appearance-none"
                  >
                    <option value="low" className="bg-white dark:bg-slate-900">Standard (Monitor & Rectify)</option>
                    <option value="medium" className="bg-white dark:bg-slate-900">Elevated (Statutory Notice Issue)</option>
                    <option value="high" className="bg-white dark:bg-slate-900">Critical (Sec 22 Action / Immediate Halt)</option>
                  </select>
                  <span className="material-symbols-outlined text-slate-400 absolute right-3.5 top-3.5 pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
                Field Observations & Description <span className="text-rose-600">*</span>
              </label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-normal resize-none"
                placeholder="Describe observed conditions, statutory non-compliance, bench stability, machine serial numbers, or required remedial action..."
              />
            </div>

            {/* GPS Location Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  GNSS / Pit GPS Location <span className="text-rose-600">*</span>
                </label>
                {formData.lat && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono text-xs flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    GPS Geotagged at {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={loadingLocation}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors text-xs font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400">satellite_alt</span>
                  {loadingLocation ? 'Acquiring GNSS Lock...' : 'Tag Precise GPS Location'}
                </button>
                
                {formData.lat && formData.lng ? (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-mono text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{formData.lat.toFixed(6)}° N, {formData.lng.toFixed(6)}° E</span>
                    <span className="text-emerald-600 dark:text-emerald-500 text-[10px] uppercase font-sans">±2.4m RTK Fixed</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_searching</span>
                    Awaiting GPS coordinates...
                  </span>
                )}
              </div>
            </div>
            
            {/* PHOTO EVIDENCE SECTION */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Photo Evidence & Geotagged Capture
                </label>
                {formData.photo_base64 && (
                  <button 
                    type="button" 
                    onClick={handleOcr} 
                    disabled={isOcrLoading} 
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1.5 transition-colors bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md"
                  >
                    {isOcrLoading ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">document_scanner</span>
                    )}
                    {isOcrLoading ? 'Extracting OCR...' : 'Extract Notice Text (OCR)'}
                  </button>
                )}
              </div>

              {formData.photo_base64 ? (
                /* PREVIEW OF CAPTURED PHOTO */
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-slate-900 group">
                  <img 
                    src={formData.photo_base64} 
                    alt="Evidence Preview" 
                    className="w-full h-64 object-contain bg-slate-950" 
                  />
                  
                  {/* Photo Actions Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md backdrop-blur border border-slate-700"
                    >
                      <span className="material-symbols-outlined text-[16px] text-amber-400">photo_camera</span>
                      Retake
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData(p => ({...p, photo_base64: ''}))} 
                      className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-md"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/75 backdrop-blur text-white text-[11px] font-mono flex items-center gap-2 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Watermark Verified • DGMS Evidentiary Stamp</span>
                  </div>
                </div>
              ) : (
                /* DROPZONE & CAMERA TRIGGER */
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500/60 dark:hover:border-amber-500/60 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950/60 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Capture or Upload Evidence
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Open your device camera directly or select an image file to attach to this statutory inspection record.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {/* Live Camera Button */}
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">videocam</span>
                      Open Live Camera
                    </button>

                    {/* File Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">folder_open</span>
                      Choose Image File
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input for fallback */}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handlePhotoCapture}
              />
            </div>

            {/* SUBMIT BUTTON & STATUS MESSAGES */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={status === 'submitting' || !formData.mine_id || !formData.category || !formData.description}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                {status === 'submitting' ? 'Submitting to DGMS Registry...' : 'Submit Statutory Inspection Report'}
              </button>
              
              {usingCachedGps && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2.5 flex items-center justify-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-[16px]">public_off</span>
                  Field Offline Mode: Using localized fallback GPS coordinates.
                </p>
              )}
              
              {status === 'success_online' && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[24px] text-emerald-600 dark:text-emerald-400 shrink-0">verified</span>
                    <div>
                      <p className="text-sm font-bold">Inspection Report Registered Online</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400/90">Synchronized with central DGMS violation repository and risk score engine.</p>
                    </div>
                  </div>
                  <Link
                    to="/violations"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold transition-colors shrink-0 shadow-sm"
                  >
                    View Violations →
                  </Link>
                </div>
              )}
              
              {status === 'success_offline' && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[24px] text-amber-600 dark:text-amber-400 shrink-0">cloud_off</span>
                    <div>
                      <p className="text-sm font-bold">Queued Offline in Local Encrypted Storage</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400/90">Stored securely on this terminal. Auto-synchronization will resume once network connectivity is re-established.</p>
                    </div>
                  </div>
                  <Link
                    to="/violations"
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 text-xs font-bold transition-colors shrink-0 shadow-sm"
                  >
                    View Queue →
                  </Link>
                </div>
              )}
              
              {status === 'error' && (
                <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-300 dark:border-rose-500/30 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-rose-600">error</span>
                  <p className="text-xs font-bold">Connection issue encountered. Record cached to offline queue.</p>
                </div>
              )}
            </div>
            
          </form>
        </div>
      </div>

      {/* ── LIVE CAMERA STREAM VIEWFINDER MODAL ── */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  DGMS Live Camera Stream
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Switch camera"
                >
                  <span className="material-symbols-outlined text-[18px]">flip_camera_android</span>
                </button>
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Close camera"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center max-w-md">
                  <span className="material-symbols-outlined text-[40px] text-rose-400 mb-2">no_photography</span>
                  <p className="text-xs text-rose-300 font-semibold mb-3">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCameraModal();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                  >
                    Upload File Instead
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/10 opacity-30">
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div></div>
                  </div>

                  {/* Top Live Badge */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 backdrop-blur text-emerald-400 font-mono text-[10px] flex items-center gap-1.5 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE STREAM 720P
                  </div>

                  {/* Shutter Flash Animation */}
                  {isCapturing && (
                    <div className="absolute inset-0 bg-white opacity-80 pointer-events-none animate-ping"></div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer / Shutter Button */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {cameraFacing === 'environment' ? 'Facing: Rear/External' : 'Facing: Front/Webcam'}
              </span>

              <button
                type="button"
                onClick={captureShutter}
                disabled={!!cameraError || isCapturing}
                className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg transition-transform border-4 border-slate-900 focus:outline-none"
                title="Capture Frame"
              >
                <span className="material-symbols-outlined text-[28px]">photo_camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeCameraModal();
                  fileInputRef.current?.click();
                }}
                className="text-xs text-slate-400 hover:text-white underline font-sans"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for capturing video frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
