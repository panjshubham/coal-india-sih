import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { savePendingSubmission } from '../services/db';
import { MapPin, Camera, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NewInspection() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  
  const [mines, setMines] = useState<{id: number, name: string}[]>([]);
  
  // Form State
  const [mineId, setMineId] = useState<string>('');
  const [type, setType] = useState('adhoc');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  
  // GPS State
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      // Fetch mines
      const { data } = await supabase.from('mines').select('id, name');
      if (data) setMines(data);

      // Pre-fill mine if mine_official
      if (role === 'mine_official' && user) {
        const { data: uData } = await supabase.from('users').select('assigned_mine_id').eq('id', user.id).single();
        if (uData?.assigned_mine_id) {
          setMineId(uData.assigned_mine_id.toString());
        }
      }

      // Capture GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            setLocationError("Failed to acquire GPS lock. Please ensure location services are enabled.");
            console.error(err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setLocationError("Geolocation is not supported by this browser.");
      }
    }
    
    init();
  }, [user, role]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mineId || !category || !severity || !description || !user) return;
    
    setLoading(true);
    
    try {
      // Offline mode check
      if (!navigator.onLine) {
        let photoBase64 = null;
        if (photo) {
          photoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(photo);
          });
        }

        const payload = {
          mineId: parseInt(mineId),
          category,
          severity,
          description,
          lat: location?.lat || null,
          lng: location?.lng || null,
          photoBase64,
          userId: user.id
        };

        await savePendingSubmission(payload);
        window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
        alert(t('form_offline_notice'));
        navigate(`/dashboard/mine`); // Or wherever makes sense
        return;
      }

      let photoUrl = '';
      
      // Upload Photo (Online)
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage.from('photos').upload(filePath, photo);
        
        if (uploadError) {
          console.warn('Storage upload failed, falling back to local URL for demo purposes.', uploadError);
          photoUrl = URL.createObjectURL(photo);
        } else if (data) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
          photoUrl = publicUrl;
        }
      }

      // 1. Insert Inspection
      const { error: inspError } = await supabase.from('inspections').insert({
        mine_id: parseInt(mineId),
        scheduled_date: new Date().toISOString(),
        status: 'completed',
        inspector_id: user.id,
        findings: description
      });
      
      if (inspError) throw inspError;

      // 2. Insert Violation
      const { data: violData, error: violError } = await supabase.from('violations').insert({
        mine_id: parseInt(mineId),
        category,
        severity,
        status: 'open',
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        photo_url: photoUrl,
        regulation_ref: 'DGMS-SEC-4.2', 
      }).select().single();

      if (violError) throw violError;

      alert('Violation successfully logged and routed to regulators.');
      navigate(`/violations/${violData.id}`);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = mineId && category && severity && description;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 md:p-8">
      
      {/* Desktop Header */}
      <div className="hidden md:block max-w-3xl mx-auto w-full mb-8">
        <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">{t('form_title')}</h1>
        <p className="text-slate-500">Record statutory field observations and immediate safety hazards.</p>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-[#0B1120] text-white p-4 sticky top-0 z-20 shadow-md flex items-center justify-center">
        <h1 className="font-serif font-bold text-lg">{t('form_title')}</h1>
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto bg-white md:border md:border-slate-200 md:rounded md:shadow-sm">
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full pb-24 md:pb-0">
          
          <div className="p-4 md:p-8 space-y-6 md:space-y-8 flex-1">
            
            {/* GPS Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">GPS Location Lock</h4>
                {location ? (
                  <div className="font-mono text-sm text-emerald-700">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    <div className="text-xs opacity-70 mt-1">{new Date().toLocaleTimeString()}</div>
                  </div>
                ) : locationError ? (
                  <div className="text-sm text-red-600 font-medium">{locationError}</div>
                ) : (
                  <div className="text-sm text-emerald-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Acquiring satellite lock...
                  </div>
                )}
              </div>
            </div>

            {/* Mine & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('form_mine')}</label>
                <select 
                  value={mineId}
                  onChange={e => setMineId(e.target.value)}
                  disabled={role === 'mine_official'}
                  className="w-full h-12 md:h-10 px-3 border border-slate-300 rounded text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">-- {t('form_mine')} --</option>
                  {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('form_type')}</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full h-12 md:h-10 px-3 border border-slate-300 rounded text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="adhoc">Ad-hoc / Unscheduled</option>
                  <option value="scheduled">Scheduled Audit</option>
                </select>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('form_category')}</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-12 md:h-10 px-3 border border-slate-300 rounded text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Select --</option>
                <option value="Safety">Safety Protocol</option>
                <option value="Environment">Environmental Compliance</option>
                <option value="Production">Production Guidelines</option>
                <option value="Labour">Labour Regulations</option>
              </select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('form_severity')}</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
                {['Low', 'Medium', 'High', 'Critical'].map(sev => {
                  const isSelected = severity === sev;
                  
                  let colors = '';
                  if (sev === 'Low') colors = isSelected ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                  if (sev === 'Medium') colors = isSelected ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
                  if (sev === 'High') colors = isSelected ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
                  if (sev === 'Critical') colors = isSelected ? 'bg-red-600 text-white border-red-700' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';

                  const sevLabel = sev === 'Low' ? t('status_low') : sev === 'Medium' ? t('status_medium') : sev === 'High' ? t('status_high') : t('status_critical');

                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`h-12 md:h-10 flex items-center justify-center rounded border font-bold text-sm tracking-wide transition-colors ${colors}`}
                    >
                      {sevLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('form_desc')}</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                className="w-full p-3 border border-slate-300 rounded text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                placeholder="Detail the exact nature of the violation, statutory references, and immediate hazards observed..."
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">{t('form_photo')}</label>
              <input 
                type="file" 
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden" 
              />
              {photo ? (
                <div className="relative w-full h-48 md:h-64 rounded border border-slate-300 overflow-hidden group">
                  <img src={URL.createObjectURL(photo)} alt="Evidence" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button type="button" onClick={handlePhotoClick} className="px-4 py-2 bg-white text-slate-900 rounded text-sm font-bold shadow-lg">Change Photo</button>
                  </div>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={handlePhotoClick}
                  className="w-full h-32 md:h-48 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-500 hover:border-amber-500 hover:text-amber-600 transition-colors bg-slate-50"
                >
                  <Camera className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Tap to capture or upload photo</span>
                </button>
              )}
            </div>

          </div>

          {/* Sticky Submit Bar - Mobile (fixed bottom) / Desktop (inline) */}
          <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-8 bg-white border-t border-slate-200 z-30">
            <button 
              type="submit" 
              disabled={!isValid || loading}
              className="w-full h-14 md:h-12 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold tracking-wide text-lg md:text-base rounded transition-colors shadow-lg md:shadow-none disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              {loading ? 'Submitting to DGMS...' : t('form_submit')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
