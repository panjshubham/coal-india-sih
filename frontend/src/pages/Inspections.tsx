import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, Camera, AlertCircle, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';
import { getProfile, type InspectorProfile } from '../services/profileService';
import { savePendingSubmission, getPendingSubmissions, removePendingSubmission } from '../services/db';
import Tesseract from 'tesseract.js';

export default function Inspections() {
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const [mines, setMines] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      // If offline, we might not be able to fetch these, but PWA cache might serve previous requests
      // Alternatively we could cache mines/contractors in IDB too. For now, rely on standard caching.
      try {
        const { data: mData } = await supabase.from('mines').select('id, name');
        const { data: cData } = await supabase.from('contractors').select('id, name');
        if (mData) setMines(mData);
        if (cData) setContractors(cData);
      } catch(e) {
        console.error('Failed to fetch reference data. You might be offline.');
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
      autoSync(); // Trigger sync when coming back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine) {
      autoSync();
    }

    return () => {
      window.removeEventListener('coalguard:profileUpdated', handleProfileUpdate);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const autoSync = async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      const pending = await getPendingSubmissions();
      for (const item of pending) {
        // We first need to create an inspection record, then a violation record
        // The payload combines both for simplicity
        const p = item.payload;
        
        const { data: inspData, error: inspErr } = await supabase.from('inspections').insert([{
          mine_id: Number(p.mine_id),
          contractor_id: p.contractor_id ? Number(p.contractor_id) : null,
          inspector_id: p.inspector_id, // assuming we have this, else omit or handle
          type: 'routine',
          scheduled_date: new Date().toISOString().split('T')[0],
        }]).select('id').single();

        if (inspErr) throw inspErr;

        const { error: violErr } = await supabase.from('violations').insert([{
          inspection_id: inspData.id,
          mine_id: Number(p.mine_id),
          category: p.category,
          severity: p.severity,
          description: p.description,
          photo_url: p.photo_base64, // In real app, upload base64 to storage, save URL. Here we just save the base64 string directly for demo.
          latitude: p.lat,
          longitude: p.lng,
          timestamp: p.timestamp,
          status: 'open'
        }]);

        if (violErr) throw violErr;

        if (item.id) {
          await removePendingSubmission(item.id);
        }
      }
      window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
    } catch (e) {
      console.error('Auto-sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  const captureLocation = () => {
    setLoadingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          setLoadingLocation(false);
        },
        (error) => {
          console.error('Error getting location', error);
          alert('Could not capture location. Please ensure location services are enabled.');
          setLoadingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setLoadingLocation(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // We need the inspector's ID from auth context in a real scenario
    const { data: { session } } = await supabase.auth.getSession();
    const inspector_id = session?.user?.id;
    
    const payload = {
      ...formData,
      inspector_id,
      timestamp: new Date().toISOString()
    };

    if (isOnline) {
      try {
        const { data: inspData, error: inspErr } = await supabase.from('inspections').insert([{
          mine_id: Number(payload.mine_id),
          contractor_id: payload.contractor_id ? Number(payload.contractor_id) : null,
          inspector_id: inspector_id,
          type: 'routine',
          scheduled_date: new Date().toISOString().split('T')[0],
          status: 'completed'
        }]).select('id').single();

        if (inspErr) throw inspErr;

        const { error: violErr } = await supabase.from('violations').insert([{
          inspection_id: inspData.id,
          mine_id: Number(payload.mine_id),
          category: payload.category,
          severity: payload.severity,
          description: payload.description,
          photo_url: payload.photo_base64,
          latitude: payload.lat,
          longitude: payload.lng,
          timestamp: payload.timestamp,
          status: 'open'
        }]);

        if (violErr) throw violErr;

        setStatus('success_online');
        resetForm();
      } catch (error) {
        console.error('Error submitting online, falling back to offline queue', error);
        await saveOffline(payload);
      }
    } else {
      await saveOffline(payload);
    }
  };

  const saveOffline = async (payload: any) => {
    try {
      await savePendingSubmission(payload);
      window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
      setStatus('success_offline');
      resetForm();
    } catch (e) {
      console.error('Failed to save offline', e);
      setStatus('error');
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Log Violation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Record a statutory violation with geo-tags (Offline supported).</p>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
            </span>
          )}
          <Link
            to="/profile"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 transition-colors w-fit flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Profile</span>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Mine *</label>
              <select 
                required
                value={formData.mine_id}
                onChange={e => setFormData(prev => ({...prev, mine_id: e.target.value}))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Mine --</option>
                {mines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contractor (Optional)</label>
              <select 
                value={formData.contractor_id}
                onChange={e => setFormData(prev => ({...prev, contractor_id: e.target.value}))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- None --</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <select 
                required
                value={formData.category}
                onChange={e => setFormData(prev => ({...prev, category: e.target.value}))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="safety">Safety</option>
                <option value="environment">Environment</option>
                <option value="production">Production</option>
                <option value="labour">Labour</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity *</label>
              <select 
                required
                value={formData.severity}
                onChange={e => setFormData(prev => ({...prev, severity: e.target.value}))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Detailed description of the violation..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location Tracking *</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={captureLocation}
                disabled={loadingLocation}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
              >
                <MapPin className="w-4 h-4" />
                {loadingLocation ? 'Capturing...' : 'Capture GPS Coordinates'}
              </button>
              
              {formData.lat && formData.lng && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                </span>
              )}
            </div>
            {formData.lat && (
              <p className="text-xs text-gray-500">Timestamp: {new Date().toLocaleTimeString()}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Photo Evidence</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center">
              {formData.photo_base64 ? (
                <div className="relative">
                  <img src={formData.photo_base64} alt="Evidence" className="h-32 object-cover rounded" />
                  <button type="button" onClick={() => setFormData(p => ({...p, photo_base64: ''}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs">X</button>
                </div>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Tap to take a photo</p>
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
              <div className="flex items-center gap-2 mt-4">
                {!formData.photo_base64 && (
                  <label htmlFor="camera-input" className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-sm font-medium cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50">
                    Open Camera
                  </label>
                )}
                {formData.photo_base64 && (
                  <button type="button" onClick={handleOcr} disabled={isOcrLoading} className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 rounded-md text-sm font-medium cursor-pointer hover:bg-amber-100 transition-colors flex items-center gap-2">
                    {isOcrLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-[16px]">document_scanner</span>}
                    {isOcrLoading ? 'Scanning...' : 'Extract Text (OCR)'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={status === 'submitting' || !formData.lat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Violation'}
            </button>
            
            {!formData.lat && (
              <p className="text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                GPS coordinates are required
              </p>
            )}
            
            {status === 'success_online' && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">Violation logged successfully to database.</p>
              </div>
            )}
            
            {status === 'success_offline' && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">Saved offline - will sync automatically when connected.</p>
              </div>
            )}
            
            {status === 'error' && (
              <p className="text-sm text-red-600 mt-2 text-center">Failed to submit violation.</p>
            )}
          </div>
          
        </form>
      </div>
    </div>
  );
}
