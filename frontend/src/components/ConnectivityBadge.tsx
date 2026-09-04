import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { getPendingCount } from '../services/db';

export default function ConnectivityBadge() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updatePendingCount();

    // Listen for custom event when submissions are added/removed
    window.addEventListener('coalguard:syncQueueUpdated', updatePendingCount);
    
    // Poll just in case (e.g. background syncs)
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('coalguard:syncQueueUpdated', updatePendingCount);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (e) {
      console.error('Error fetching pending count', e);
    }
  };

  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-medium">
        <Wifi className="w-3.5 h-3.5" />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline {pendingCount > 0 && `- ${pendingCount} pending`}</span>
    </div>
  );
}
