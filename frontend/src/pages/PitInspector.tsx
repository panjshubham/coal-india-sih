import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Mic, Camera, UploadCloud, CheckCircle, RefreshCw } from 'lucide-react';
import { queueInspection, syncOfflineQueue, db, type OfflineInspection } from '../lib/offlineQueue';

export default function PitInspector() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);
  const [queuedItems, setQueuedItems] = useState<OfflineInspection[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load of queue
    loadQueue();

    // Listen for sync updates
    const handleSyncUpdate = () => {
      loadQueue();
    };
    window.addEventListener('coalguard:syncQueueUpdated', handleSyncUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('coalguard:syncQueueUpdated', handleSyncUpdate);
    };
  }, []);

  const loadQueue = async () => {
    const items = await db.offline_inspections.where('status').anyOf(['queued', 'syncing']).toArray();
    setQueuedItems(items);
  };

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
          },
          () => {
            resolve({ lat: 0, lng: 0 }); // Fallback
          }
        );
      } else {
        resolve({ lat: 0, lng: 0 }); // Fallback
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const { lat, lng } = await getLocation();
        await queueInspection('voice', audioBlob, lat, lng);
        
        // If online, immediately try to sync
        if (isOnline) {
          syncOfflineQueue();
        } else {
          loadQueue();
        }
        
        // stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const { lat, lng } = await getLocation();
      await queueInspection('photo', file, lat, lng);
      
      if (isOnline) {
        syncOfflineQueue();
      } else {
        loadQueue();
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Network Status Banner */}
      <div className={`p-4 rounded-lg flex items-center gap-3 font-semibold text-white ${isOnline ? 'bg-green-600' : 'bg-amber-600'}`}>
        {isOnline ? (
          <>
            <Wifi className="w-6 h-6" />
            <span>ONLINE • Master Node Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-6 h-6" />
            <span>OFFLINE MODE • Local Storage Active (Underground Gallery)</span>
          </>
        )}
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-md">
        <h2 className="text-xl font-bold text-white mb-4">Pit Inspector View</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Voice Recorder */}
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg flex flex-col items-center justify-center min-h-[200px]">
            <h3 className="text-lg font-semibold text-white mb-4">Voice Report</h3>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-6 rounded-full transition-colors ${
                isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
            <p className="mt-4 text-slate-400 text-sm">
              {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
            </p>
          </div>

          {/* Camera Input */}
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg flex flex-col items-center justify-center min-h-[200px]">
            <h3 className="text-lg font-semibold text-white mb-4">Photo Inspection</h3>
            <label className="p-6 rounded-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer transition-colors">
              <Camera className="w-10 h-10 text-white" />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={handlePhotoCapture}
              />
            </label>
            <p className="mt-4 text-slate-400 text-sm">Tap to capture photo</p>
          </div>

        </div>
      </div>

      {/* Sync Tray Toggle */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700 flex justify-between items-center z-40 lg:ml-64">
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="flex items-center gap-2 text-white hover:text-blue-400 transition"
        >
          <UploadCloud className="w-5 h-5" />
          <span>Sync Tray ({queuedItems.length} items)</span>
        </button>
        <button
          onClick={() => syncOfflineQueue()}
          disabled={!isOnline || queuedItems.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded flex items-center gap-2 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Sync Now
        </button>
      </div>

      {/* Sync Tray Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-800 h-full overflow-y-auto border-l border-slate-700 shadow-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-blue-400" />
              Offline Sync Queue
            </h3>
            
            {queuedItems.length === 0 ? (
              <div className="text-slate-400 text-center py-10 flex flex-col items-center gap-2">
                <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                <p>All items synced successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queuedItems.map((item) => (
                  <div key={item.id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-white uppercase bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                        {item.type} Report
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.status === 'syncing' ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex flex-col gap-1">
                      <span>Recorded: {new Date(item.timestamp).toLocaleString()}</span>
                      <span>GPS: {item.gps.lat.toFixed(4)}, {item.gps.lng.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
