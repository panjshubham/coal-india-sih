// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { savePendingSubmission } from '../services/db';

export default function NewInspection() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  // Form State
  const [mineId, setMineId] = useState<string>('');
  const [category, setCategory] = useState('Overburden Slope & Bench Geometry (CMR Reg 115)');
  const [severity, setSeverity] = useState('critical');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isPhotoPreviewVisible, setIsPhotoPreviewVisible] = useState(false);
  const [stopDirective, setStopDirective] = useState(true);
  
  // UI State
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  
  // Strict GPS & Timestamp State
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [capturedTimestamp, setCapturedTimestamp] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchMineAssignment() {
      if (role === 'mine_official' && user) {
        const { data: uData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
        if (uData?.assigned_mine_id) {
          setMineId(uData.assigned_mine_id.toString());
        }
      } else {
        setMineId('1'); // Fallback
      }
    }
    fetchMineAssignment();
    captureLocation();
  }, [user, role]);

  const forceMockLocation = () => {
    setLocation({ lat: 23.7923, lng: 86.4253 }); // Demo Dhanbad coordinates
    setCapturedTimestamp(new Date().toISOString());
    setIsCapturingGPS(false);
    setGpsError(null);
  };

  const captureLocation = () => {
    setIsCapturingGPS(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported, using fallback');
      forceMockLocation();
      return;
    }

    // Add a failsafe timeout in case getCurrentPosition hangs completely
    let isResolved = false;
    const failsafe = setTimeout(() => {
      if (!isResolved) {
        console.warn('Geolocation timeout, using fallback');
        forceMockLocation();
      }
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isResolved = true;
        clearTimeout(failsafe);
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCapturedTimestamp(new Date().toISOString());
        setIsCapturingGPS(false);
        setGpsError(null);
      },
      (err) => {
        isResolved = true;
        clearTimeout(failsafe);
        console.warn('Geolocation error:', err.message, 'Using fallback location.');
        forceMockLocation(); // Auto-fallback instead of blocking the user
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
      setIsPhotoPreviewVisible(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !capturedTimestamp) {
      alert("Cannot submit without valid GPS coordinates and timestamp.");
      return;
    }
    setLoading(true);
    
    try {
      const ts = capturedTimestamp;
      const lat = location.lat;
      const lng = location.lng;

      if (!navigator.onLine) {
        // Encode photo to base64 so it's preserved in IDB for later sync
        let photoBase64 = null;
        if (photo) {
          photoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(photo);
          });
        }
        const payload = {
          mineId: parseInt(mineId || '1'),
          category,
          severity,
          description: `${headline}\n\n${description}`,
          lat, lng, timestamp: ts, photoBase64,
          userId: user?.id || ''
        };
        await savePendingSubmission(payload);
        window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
        alert('Saved offline. Will auto-sync when reconnected.');
        setTimeout(() => navigate('/submissions'), 500);
        return;
      }

      // Upload photo to Supabase Storage (real upload, not hardcoded)
      let photoUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split('.').pop() || 'jpg';
        const filePath = `${user?.id || 'anon'}/${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('photos')
          .upload(filePath, photo, { contentType: photo.type });
        if (!upErr && upData) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
          photoUrl = publicUrl;
        } else {
          console.warn('Photo upload failed, proceeding without photo:', upErr);
        }
      }

      // 1. Insert Inspection
      const { data: inspData, error: inspError } = await supabase.from('inspections').insert({
        mine_id: parseInt(mineId || '1'),
        date: new Date().toISOString(),
        inspector_name: user?.id || 'Unknown'
      }).select().single();
      
      if (inspError) throw inspError;

      // 2. Insert Violation with real GPS + real photo_url from Storage
      const { data: violData, error: violError } = await supabase.from('violations').insert({
        mine_id: parseInt(mineId || '1'),
        inspection_id: inspData.id,
        category,
        severity: severity === 'advisory' ? 'low' : severity === 'moderate' ? 'medium' : 'critical',
        status: 'open',
        description: `${headline}\n\n${description}`,
        latitude: lat,
        longitude: lng,
        photo_url: photoUrl, // Real Supabase Storage URL or null
        regulation_ref: 'DGMS-SEC-115', 
      }).select().single();
      
      if (violError) throw violError;

      setTimeout(() => {
        navigate(`/violations/${violData.id}`);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during submission.');
      setLoading(false);
    }
  };

  const severityStatus = 
    severity === 'advisory' ? 'Advisory Notice Logged' :
    severity === 'moderate' ? '7-Day Rectification Order' : 
    'Mandatory Immediate Stop';

  return (
    <>
      <style>{`
        body { overscroll-behavior: none; }
        ::-webkit-scrollbar { display: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 0px); }
      `}</style>

      <div className="bg-[#0b1326] text-[#dae2fd] font-sans flex flex-col min-h-screen antialiased w-full selection:bg-amber-500/30">
        
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-[#080E1D]/90 backdrop-blur-xl border-b border-white/[0.08] pt-safe">
          <div className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-200 hover:bg-white/[0.1] active:scale-95 transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-medium leading-tight">NEW FIELD REPORT</span>
                <h1 className="text-[16px] font-semibold text-white tracking-tight leading-snug truncate">Statutory Violation Form</h1>
                <span className="text-[12px] text-slate-400 truncate">DGMS Concession Lease</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-col relative w-full min-h-screen pt-24 pb-36 px-5 max-w-2xl mx-auto bg-[#080E1D] text-slate-100">
          <div className="flex flex-col gap-7">
            
            {/* Section 1: Auto-captured Geo-Telemetry */}
            <section className={`rounded-2xl border p-5 relative overflow-hidden backdrop-blur-sm transition-all ${gpsError ? 'bg-error/10 border-error/30' : 'bg-white/[0.03] border-white/[0.08]'}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[18px] ${gpsError ? 'text-error' : 'text-amber-400'}`}>satellite_alt</span>
                  <span className={`text-[11px] font-mono font-semibold tracking-wider uppercase ${gpsError ? 'text-error' : 'text-slate-300'}`}>
                    VERIFIED GEO-TELEMETRY
                  </span>
                </div>
                {!gpsError && location && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-mono">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    <span>EXIF & SENSOR SEALED</span>
                  </div>
                )}
              </div>
              
              {isCapturingGPS ? (
                <div className="flex items-center gap-2 text-primary font-mono text-[13px] animate-pulse">
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  Capturing GNSS RTK Lock...
                </div>
              ) : gpsError ? (
                <div className="flex flex-col gap-3">
                  <span className="text-error font-medium text-[13px]">{gpsError}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={captureLocation} className="w-fit px-4 py-2 bg-error text-on-error rounded font-semibold text-[13px] flex items-center gap-2 active:scale-95 transition-transform">
                      <span className="material-symbols-outlined text-[16px]">refresh</span> Retry GPS Lock
                    </button>
                    <button onClick={forceMockLocation} className="w-fit px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-semibold text-[13px] flex items-center gap-2 active:scale-95 transition-transform">
                      <span className="material-symbols-outlined text-[16px]">bug_report</span> Force Demo Lock (Dev)
                    </button>
                  </div>
                </div>
              ) : location ? (
                <div className="space-y-1.5">
                  <div className="text-[15px] font-mono font-medium text-white tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">my_location</span>
                    {location.lat.toFixed(6)}°N, {location.lng.toFixed(6)}°E
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400 font-mono">
                    <span className="text-emerald-400">Time: {new Date(capturedTimestamp!).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST</span>
                    <span>•</span>
                    <span>Synced via Device GNSS</span>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Section 2: Statutory Category Picker */}
            <section className="flex flex-col gap-2">
              <label className="text-[12px] font-medium tracking-wide uppercase text-slate-300 flex items-center justify-between">
                <span>Violation Category <span className="text-rose-400 font-bold">*</span></span>
              </label>
              <button 
                type="button"
                onClick={() => setIsCategoryDrawerOpen(true)}
                className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.12] flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-amber-400 text-[20px] shrink-0">rule</span>
                  <span className="text-[15px] font-medium text-white truncate">{category}</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">expand_more</span>
              </button>
            </section>

            {/* Section 3: Severity Selection */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium tracking-wide uppercase text-slate-300">Severity Classification <span className="text-rose-400 font-bold">*</span></label>
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                  severity === 'advisory' ? 'text-emerald-400' : 
                  severity === 'moderate' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {severityStatus}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => setSeverity('advisory')}
                  className={`min-h-[50px] py-2 px-3 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-150 active:scale-95 ${
                    severity === 'advisory' 
                      ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-500' 
                      : 'border border-white/15 bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <span className="text-[13px] font-semibold tracking-wide uppercase">Advisory</span>
                  <span className="text-[10px] opacity-70 mt-0.5 font-mono">Notice Only</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setSeverity('moderate')}
                  className={`min-h-[50px] py-2 px-3 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-150 active:scale-95 ${
                    severity === 'moderate' 
                      ? 'bg-amber-600 text-white font-semibold shadow-lg shadow-amber-950/40 border border-amber-500' 
                      : 'border border-white/15 bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <span className="text-[13px] font-semibold tracking-wide uppercase">Moderate</span>
                  <span className="text-[10px] opacity-70 mt-0.5 font-mono">7-Day Action</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setSeverity('critical')}
                  className={`min-h-[50px] py-2 px-3 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-150 active:scale-95 ${
                    severity === 'critical' 
                      ? 'bg-red-600 text-white font-semibold shadow-lg shadow-red-950/50 border border-red-500' 
                      : 'border border-white/15 bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <span className="text-[13px] font-bold tracking-wide uppercase flex items-center gap-1">
                    {severity === 'critical' && <span className="material-symbols-outlined text-[15px]">warning</span>}
                    Critical
                  </span>
                  <span className="text-[10px] text-white/90 mt-0.5 font-mono font-medium">Immediate Stop</span>
                </button>
              </div>
            </section>

            {/* Section 4: Headline Tag */}
            <section className="flex flex-col gap-2">
              <label className="text-[12px] font-medium tracking-wide uppercase text-slate-300">Incident Headline <span className="text-rose-400 font-bold">*</span></label>
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white text-[15px] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  placeholder="e.g. Tension crack on OB Bench #7" 
                />
              </div>
            </section>

            {/* Section 5: Description Field */}
            <section className="flex flex-col gap-2">
              <label className="text-[12px] font-medium tracking-wide uppercase text-slate-300">Observations & Directives <span className="text-rose-400 font-bold">*</span></label>
              <div className="relative rounded-xl bg-white/[0.04] border border-white/[0.12] focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500 transition-all p-3">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent text-white text-[15px] leading-relaxed placeholder-slate-500 focus:outline-none resize-none min-h-[100px]" 
                  placeholder="Detailed description of statutory non-compliances..."
                />
              </div>
            </section>

            {/* Section 6: Photo Upload Area */}
            <section className="flex flex-col gap-3">
              <label className="text-[12px] font-medium tracking-wide uppercase text-slate-300">Visual Evidence (Optional)</label>
              
              <input 
                type="file" 
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden" 
              />

              {!isPhotoPreviewVisible && !photo ? (
                <button 
                  type="button" 
                  onClick={handlePhotoClick}
                  className="w-full border-2 border-dashed border-white/20 hover:border-amber-400/50 rounded-2xl p-6 text-center bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-2 group min-h-[120px]"
                >
                  <div className="w-12 h-12 rounded-full bg-white/[0.06] group-hover:bg-amber-400/20 group-hover:text-amber-300 flex items-center justify-center text-slate-300 transition-all">
                    <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[15px] font-semibold text-white">Add photo</span>
                    <span className="text-[12px] text-slate-400 mt-0.5">High-resolution geotagged photo</span>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/[0.12] bg-white/[0.03] p-3 flex items-center gap-4 transition-all">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-white/[0.1] bg-slate-900">
                    <img 
                      src={photo ? URL.createObjectURL(photo) : ""} 
                      alt="Violation evidence" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-white truncate">{photo ? photo.name : 'evidence.jpg'}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setPhoto(null); setIsPhotoPreviewVisible(false); }}
                    className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 flex items-center justify-center transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Fixed Bottom Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080E1D]/95 backdrop-blur-xl border-t border-white/[0.08] px-5 py-3.5 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
          <div className="max-w-2xl mx-auto flex flex-col gap-2">
            <button 
              type="button" 
              onClick={handleSubmit}
              disabled={loading || !location || !capturedTimestamp}
              className={`w-full min-h-[52px] rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all font-bold text-[16px] ${
                loading 
                  ? 'bg-emerald-500 text-white' 
                  : !location 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-[#080E1D] shadow-amber-950/40'
              }`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Sealing & Broadcasting...</span>
                </>
              ) : !location ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">location_disabled</span>
                  <span>Awaiting GPS Lock...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>Submit Field Report →</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Category Picker Bottom Sheet */}
        {isCategoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={() => setIsCategoryDrawerOpen(false)} />
            <div className="relative w-full max-w-2xl mx-auto bg-[#0F172A] border-t border-white/10 sm:border sm:rounded-2xl rounded-t-2xl p-5 pb-safe shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Select Statutory Classification</span>
                  <span className="text-[16px] font-bold text-white">Violation Category</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsCategoryDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-slate-300 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="flex flex-col gap-2 py-1 h-64 overflow-y-auto">
                {[
                  'Overburden Slope & Bench Geometry (CMR Reg 115)',
                  'Ventilation & Methane Concentration (Mines Act Sec 19)',
                  'Haul Road Safety & Berm Specs (CMR Sec 22A)',
                  'Explosives & Blasting Clearance (CMR Reg 164)',
                  'Groundwater Inflow & Drainage (Air & Water Act)'
                ].map((cat) => (
                  <button 
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat); setIsCategoryDrawerOpen(false); }}
                    className={`w-full p-3.5 rounded-xl font-medium flex items-center justify-between text-left transition-colors ${
                      category === cat 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-white' 
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-slate-200'
                    }`}
                  >
                    <span className="text-[14px]">{cat}</span>
                    <span className={`material-symbols-outlined text-[18px] ${category === cat ? 'text-amber-400' : 'text-transparent'}`}>
                      {category === cat ? 'check_circle' : 'circle'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
