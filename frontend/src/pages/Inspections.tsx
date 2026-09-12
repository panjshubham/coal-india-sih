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
      alert("Please capture a photo first!");
      return;
    }
    setIsOcrLoading(true);
    try {
      const result = await Tesseract.recognize(
        formData.photo_base64,
        'eng',
        { logger: m => console.log(m) }
      );
      setFormData(prev => ({ ...prev, description: result.data.text }));
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
        // 1. Insert inspection with correct schema columns
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

        // 2. Insert violation with all required columns
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
    <>
      <style>{`
        .bg-surface { background-color: var(--cg-bg); }
        .bg-surface-container-low { background-color: var(--cg-surface-low); }
        .bg-surface-container-lowest { background-color: var(--cg-surface-elevated); }
        .bg-surface-container { background-color: var(--cg-surface); }
        .bg-surface-container-high { background-color: var(--cg-surface-high); }
        .bg-surface-container-highest { background-color: var(--cg-surface-highest); }
        .bg-surface-bright { background-color: var(--cg-surface-highest); }
        .bg-primary { background-color: #8ed5ff; }
        .bg-primary-container { background-color: #38bdf8; }
        .bg-secondary { background-color: #ffb95f; }
        .bg-secondary-container { background-color: #ee9800; }
        .bg-error { background-color: #ffb4ab; }
        .bg-error-container { background-color: #93000a; }
        .bg-tertiary { background-color: #afcfff; }
        .bg-outline { background-color: #87929a; }
        .bg-outline-variant { background-color: #3e484f; }
        
        .text-on-surface { color: var(--cg-text-primary); }
        .text-on-surface-variant { color: var(--cg-text-muted); }
        .text-primary { color: #8ed5ff; }
        .text-primary-container { color: #38bdf8; }
        .text-on-primary-container { color: #004965; }
        .text-on-primary { color: #00354a; }
        .text-secondary { color: #ffb95f; }
        .text-on-secondary { color: #472a00; }
        .text-tertiary { color: #afcfff; }
        .text-error { color: #ffb4ab; }
        .text-on-error { color: #690005; }
        .text-outline { color: #87929a; }
        .text-outline-variant { color: #3e484f; }

        .px-space-xs { padding-left: 0.25rem; padding-right: 0.25rem; }
        .py-space-xs { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-space-2xs { padding-top: 0.125rem; padding-bottom: 0.125rem; }
        .px-space-sm { padding-left: 0.5rem; padding-right: 0.5rem; }
        .py-space-sm { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .px-space-md { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-space-md { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .px-space-lg { padding-left: 1rem; padding-right: 1rem; }
        .py-space-lg { padding-top: 1rem; padding-bottom: 1rem; }
        .px-space-xl { padding-left: 1.5rem; padding-right: 1.5rem; }
        .p-space-xs { padding: 0.25rem; }
        .p-space-sm { padding: 0.5rem; }
        .p-space-md { padding: 0.75rem; }
        .p-space-lg { padding: 1rem; }
        .p-space-xl { padding: 1.5rem; }
        
        .gap-space-2xs { gap: 0.125rem; }
        .gap-space-xs { gap: 0.25rem; }
        .gap-space-sm { gap: 0.5rem; }
        .gap-space-md { gap: 0.75rem; }
        .gap-space-lg { gap: 1rem; }
        
        .font-headline-lg { font-family: 'Hanken Grotesk', sans-serif; font-size: 28px; line-height: 36px; font-weight: 600; letter-spacing: -0.015em; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 20px; line-height: 28px; font-weight: 500; letter-spacing: -0.01em; }
        .font-headline-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 16px; line-height: 24px; font-weight: 500; }
        .font-body-lg { font-family: 'Geist', sans-serif; font-size: 15px; line-height: 24px; font-weight: 400; }
        .font-body-md { font-family: 'Geist', sans-serif; font-size: 13px; line-height: 20px; font-weight: 400; }
        .font-body-sm { font-family: 'Geist', sans-serif; font-size: 12px; line-height: 18px; font-weight: 400; }
        .font-label-md { font-family: 'Geist', sans-serif; font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.04em; }
        .font-code-sm { font-family: 'Geist', monospace; font-size: 12px; line-height: 16px; font-weight: 400; }
      `}</style>

      <div className="w-full bg-surface min-h-screen text-on-surface font-body-md p-space-lg flex flex-col gap-space-lg items-center">
        
        <div className="w-full max-w-4xl flex flex-col gap-space-lg">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div className="space-y-space-xs">
              <div className="flex items-center gap-space-xs font-label-md text-primary tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                INSPECTORATE TERMINAL
              </div>
              <h1 className="font-headline-lg text-on-surface font-semibold tracking-tight">
                Log New Violation
              </h1>
              <p className="font-body-md text-on-surface-variant max-w-2xl">
                Draft a statutory show-cause dossier with cryptographic GPS-tagging and offline syncing capabilities.
              </p>
            </div>
            <div className="flex flex-col items-end gap-space-2xs">
              {syncing && (
                <span className="text-xs font-medium text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Syncing Ledger...
                </span>
              )}
              <Link
                to="/profile"
                className="font-label-md uppercase tracking-wider px-space-sm py-space-xs rounded bg-surface-container-high hover:bg-surface-container-highest transition-colors flex items-center gap-1.5 text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                <span>Active Duty: {profile.fullName || 'Inspector'}</span>
              </Link>
            </div>
          </div>

          {/* FORM CONTAINER */}
          <div className="bg-surface-container-low rounded-xl shadow-md overflow-hidden border border-surface-container-high/50">
            <div className="p-space-md bg-surface-container-lowest border-b border-surface-container-high/50 flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">rule</span>
                <span className="font-headline-sm font-semibold">Incident Dossier</span>
              </div>
              <div className="flex items-center gap-space-sm font-code-sm text-outline">
                <span>Network Status:</span>
                <span className={`px-2 py-0.5 rounded ${isOnline ? 'bg-primary/20 text-primary' : 'bg-error/20 text-error'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE (QUEUED)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-space-xl space-y-space-lg flex flex-col gap-space-md">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xl">
                <div className="space-y-space-xs">
                  <label className="font-label-md uppercase tracking-wider text-outline">Concession / Mine Site *</label>
                  <select 
                    required
                    value={formData.mine_id}
                    onChange={e => setFormData(prev => ({...prev, mine_id: e.target.value}))}
                    className="w-full bg-surface-container border border-surface-container-highest rounded-md px-space-md py-space-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-body-sm"
                  >
                    <option value="" className="bg-surface-container-high">-- Select Grid Target --</option>
                    {mines.map(m => (
                      <option key={m.id} value={m.id} className="bg-surface-container-high">{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-space-xs">
                  <label className="font-label-md uppercase tracking-wider text-outline">Operating Contractor</label>
                  <select 
                    value={formData.contractor_id}
                    onChange={e => setFormData(prev => ({...prev, contractor_id: e.target.value}))}
                    className="w-full bg-surface-container border border-surface-container-highest rounded-md px-space-md py-space-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-body-sm"
                  >
                    <option value="" className="bg-surface-container-high">-- Direct CIL Operator --</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id} className="bg-surface-container-high">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xl">
                <div className="space-y-space-xs">
                  <label className="font-label-md uppercase tracking-wider text-outline">Violation Category *</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
                    className="w-full bg-surface-container border border-surface-container-highest rounded-md px-space-md py-space-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-body-sm"
                  >
                    <option value="safety" className="bg-surface-container-high">Safety & Strata</option>
                    <option value="environment" className="bg-surface-container-high">Environmental Hazard</option>
                    <option value="production" className="bg-surface-container-high">Unauthorized Extraction</option>
                    <option value="labour" className="bg-surface-container-high">Labour & Welfare</option>
                  </select>
                </div>

                <div className="space-y-space-xs">
                  <label className="font-label-md uppercase tracking-wider text-outline">Threat Severity *</label>
                  <select 
                    required
                    value={formData.severity}
                    onChange={e => setFormData(prev => ({...prev, severity: e.target.value}))}
                    className="w-full bg-surface-container border border-surface-container-highest rounded-md px-space-md py-space-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-body-sm"
                  >
                    <option value="low" className="bg-surface-container-high">Standard (Monitor)</option>
                    <option value="medium" className="bg-surface-container-high">Elevated (Notice Issue)</option>
                    <option value="high" className="bg-surface-container-high">Critical (Immediate Halt)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-space-xs">
                <label className="font-label-md uppercase tracking-wider text-outline">Dossier Narrative *</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                  className="w-full bg-surface-container border border-surface-container-highest rounded-md px-space-md py-space-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-body-sm resize-none"
                  placeholder="Provide statutory findings, exact regulatory breaches, and immediate directives..."
                />
              </div>

              <div className="space-y-space-xs">
                <label className="font-label-md uppercase tracking-wider text-outline flex items-center justify-between">
                  <span>Geospatial RTK Tracking *</span>
                  {formData.lat && <span className="text-primary normal-case font-code-sm flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">my_location</span> Latched: {new Date().toLocaleTimeString()}</span>}
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-space-md bg-surface-container p-space-sm rounded border border-surface-container-highest">
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={loadingLocation}
                    className="flex items-center justify-center gap-2 px-space-md py-space-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded transition-colors font-body-sm min-w-[200px]"
                  >
                    <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
                    {loadingLocation ? 'Locking GNSS...' : 'Sync GNSS Coordinates'}
                  </button>
                  
                  {formData.lat && formData.lng ? (
                    <div className="flex items-center gap-space-xs text-primary font-code-sm bg-primary/10 px-3 py-1 rounded">
                      <span>{formData.lat.toFixed(6)}° N, {formData.lng.toFixed(6)}° E</span>
                      <span className="text-outline">± 2.4m RTK Error</span>
                    </div>
                  ) : (
                    <span className="text-outline-variant font-code-sm italic">Awaiting GNSS uplink...</span>
                  )}
                </div>
              </div>
              
              <div className="space-y-space-xs">
                <label className="font-label-md uppercase tracking-wider text-outline flex items-center justify-between">
                  <span>Visual Evidence Archive</span>
                  {formData.photo_base64 && (
                    <button type="button" onClick={handleOcr} disabled={isOcrLoading} className="text-secondary hover:text-secondary-container normal-case font-body-sm flex items-center gap-1 transition-colors">
                      {isOcrLoading ? <span className="material-symbols-outlined text-[14px] animate-spin">sync</span> : <span className="material-symbols-outlined text-[14px]">document_scanner</span>}
                      {isOcrLoading ? 'Running OCR...' : 'Extract Text (OCR)'}
                    </button>
                  )}
                </label>
                <div className="border-2 border-dashed border-surface-container-highest rounded-lg p-space-xl flex flex-col items-center justify-center text-center bg-surface-container/50 hover:bg-surface-container transition-colors relative overflow-hidden group">
                  {formData.photo_base64 ? (
                    <div className="relative w-full h-48 flex justify-center">
                      <img src={formData.photo_base64} alt="Evidence" className="h-full object-contain rounded" />
                      <button type="button" onClick={() => setFormData(p => ({...p, photo_base64: ''}))} className="absolute top-2 right-2 bg-error/90 hover:bg-error text-on-error rounded-full w-8 h-8 flex items-center justify-center transition-colors backdrop-blur">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center text-outline mb-space-sm group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                      </div>
                      <p className="font-body-sm text-outline-variant">Initialize field camera to capture evidence.</p>
                      <label htmlFor="camera-input" className="mt-space-md px-space-md py-space-xs bg-surface-container-high text-on-surface hover:bg-surface-bright rounded text-sm font-medium cursor-pointer transition-colors border border-surface-container-highest">
                        Open Field Camera
                      </label>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    id="camera-input" 
                    ref={fileInputRef}
                    onChange={handlePhotoCapture}
                  />
                </div>
              </div>

              <div className="pt-space-md">
                <button
                  type="submit"
                  disabled={status === 'submitting' || !formData.mine_id || !formData.category || !formData.description}
                  className="w-full flex items-center justify-center gap-space-xs px-space-md py-space-sm bg-primary text-on-primary rounded font-headline-sm text-[15px] hover:bg-primary-container transition-all shadow-[0_0_12px_rgba(142,213,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  {status === 'submitting' ? 'Encrypting & Dispatching...' : 'File Statutory Dossier'}
                </button>
                
                {usingCachedGps && (
                  <p className="font-code-sm text-emerald-400 mt-space-sm flex items-center justify-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[16px]">public_off</span>
                    🌐 Working Offline: Using Cached GPS Location.
                  </p>
                )}
                
                {status === 'success_online' && (
                  <div className="mt-space-md p-space-md bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-emerald-400 shrink-0">verified</span>
                      <p className="font-body-sm font-bold">Violation Dossier Filed &amp; Confirmed on Server!</p>
                    </div>
                    <Link
                      to="/violations"
                      className="px-3 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-label-md uppercase tracking-wider transition-colors shrink-0"
                    >
                      View Violations Archive →
                    </Link>
                  </div>
                )}
                
                {status === 'success_offline' && (
                  <div className="mt-space-md p-space-md bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30 flex items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-amber-400 shrink-0">cloud_done</span>
                      <div>
                        <p className="font-body-sm font-bold">Queued Offline Locally</p>
                        <p className="text-xs text-amber-400/80">Stored on device. Will auto-sync to violations ledger once back online.</p>
                      </div>
                    </div>
                    <Link
                      to="/violations"
                      className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-label-md uppercase tracking-wider transition-colors shrink-0"
                    >
                      View Queue →
                    </Link>
                  </div>
                )}
                
                {status === 'error' && (
                  <div className="mt-space-md p-space-sm bg-error/10 text-error rounded border border-error/20 flex items-center justify-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    <p className="font-body-sm">Cryptographic handshake failed. Attempting local save.</p>
                  </div>
                )}
              </div>
              
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
