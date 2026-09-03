import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, Camera, AlertCircle, CheckCircle2, UserCheck, Phone } from 'lucide-react';
import { getProfile, type InspectorProfile } from '../services/profileService';

export default function Inspections() {
  const [profile, setProfile] = useState<InspectorProfile>(getProfile());
  const [mines, setMines] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    mine_id: '',
    contractor_id: '',
    inspector_name: getProfile().fullName,
    lat: null as number | null,
    lng: null as number | null,
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function fetchData() {
      const { data: mData } = await supabase.from('mines').select('id, name');
      const { data: cData } = await supabase.from('contractors').select('id, name');
      if (mData) setMines(mData);
      if (cData) setContractors(cData);
    }
    fetchData();

    const handleProfileUpdate = (e: any) => {
      const updated = e.detail || getProfile();
      setProfile(updated);
      setFormData(prev => ({ ...prev, inspector_name: updated.fullName }));
    };
    window.addEventListener('coalguard:profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('coalguard:profileUpdated', handleProfileUpdate);
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // In a real app, we'd capture photos and send them to Supabase Storage here
    
    const { error } = await supabase
      .from('inspections')
      .insert([
        {
          mine_id: Number(formData.mine_id),
          contractor_id: formData.contractor_id ? Number(formData.contractor_id) : null,
          inspector_name: formData.inspector_name,
        }
      ]);

    if (error) {
      console.error('Error submitting inspection', error);
      setStatus('error');
    } else {
      setStatus('success');
      setFormData({
        mine_id: '',
        contractor_id: '',
        inspector_name: profile.fullName,
        lat: null,
        lng: null,
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Submit Field Inspection</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Record statutory field inspection with geo-tagged compliance coordinates.</p>
        </div>
        <Link
          to="/profile"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 transition-colors w-fit flex items-center gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Update Officer Profile</span>
        </Link>
      </div>

      {/* Emergency Officer Safety & Family Contact Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-gray-700 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Inspector: {profile.fullName}</span>
              <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold">{profile.badgeId}</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
              Secondary Family SOS: <strong className="font-mono text-amber-700 dark:text-amber-400">{profile.secondaryPhone}</strong> ({profile.familyContactName} - {profile.familyRelationship})
            </p>
          </div>
        </div>
        <Link
          to="/profile"
          className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline underline-offset-2 shrink-0"
        >
          Change Secondary Contact
        </Link>
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
                  Geo-tagged: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Photo Evidence</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Tap to take a photo or upload from gallery</p>
              <input type="file" accept="image/*" capture="environment" className="hidden" id="camera-input" />
              <label htmlFor="camera-input" className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-sm font-medium cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50">
                Open Camera
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={status === 'submitting' || !formData.lat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Inspection Report'}
            </button>
            
            {!formData.lat && (
              <p className="text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                GPS coordinates are required for field compliance
              </p>
            )}
            
            {status === 'success' && (
              <p className="text-sm text-emerald-600 mt-2 text-center">Inspection submitted successfully!</p>
            )}
            {status === 'error' && (
              <p className="text-sm text-red-600 mt-2 text-center">Failed to submit inspection.</p>
            )}
          </div>
          
        </form>
      </div>
    </div>
  );
}
