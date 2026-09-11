import Dexie, { type Table } from 'dexie';

export interface OfflineInspection {
  id?: number;
  type: 'voice' | 'photo' | 'form';
  payload: Blob | string; // Use Blob for voice/photo, string for form data
  gps: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  status: 'queued' | 'syncing' | 'synced';
  retry_count: number;
}

export interface LocalCache {
  key: string;
  value: any;
}

export class CoalGuardOfflineDB extends Dexie {
  offline_inspections!: Table<OfflineInspection, number>;
  local_cache!: Table<LocalCache, string>;

  constructor() {
    super('CoalGuardOfflineDB');
    this.version(1).stores({
      offline_inspections: '++id, type, status, timestamp',
      local_cache: 'key'
    });
  }
}

export const db = new CoalGuardOfflineDB();

export const queueInspection = async (
  type: 'voice' | 'photo' | 'form',
  payload: Blob | string,
  lat: number,
  lng: number
) => {
  return await db.offline_inspections.add({
    type,
    payload,
    gps: { lat, lng },
    timestamp: new Date().toISOString(),
    status: 'queued',
    retry_count: 0
  });
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;

  const queued = await db.offline_inspections.where('status').equals('queued').toArray();
  if (queued.length === 0) return;

  for (const item of queued) {
    if (!item.id) continue;

    try {
      // Mark as syncing
      await db.offline_inspections.update(item.id, { status: 'syncing' });

      let endpoint = '';
      let formData = new FormData();

      formData.append('lat', item.gps.lat.toString());
      formData.append('lng', item.gps.lng.toString());
      formData.append('timestamp', item.timestamp);

      if (item.type === 'voice') {
        endpoint = 'http://localhost:8000/api/pipeline/voice-report';
        formData.append('file', item.payload as Blob, `voice_${item.id}.webm`);
      } else if (item.type === 'photo') {
        endpoint = 'http://localhost:8000/api/pipeline/photo-inspection';
        formData.append('file', item.payload as Blob, `photo_${item.id}.jpg`);
      } else {
        endpoint = 'http://localhost:8000/api/pipeline/document-process';
        // Assume document form data is stored appropriately in payload
        if (typeof item.payload === 'string') {
          formData.append('data', item.payload);
        } else {
          formData.append('file', item.payload as Blob, `doc_${item.id}.jpg`);
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type explicitly when using FormData, browser sets it with boundary
      });

      if (response.ok) {
        // Mark as synced and we can either delete or keep for history
        await db.offline_inspections.update(item.id, { status: 'synced' });
        // Optionally delete: await db.offline_inspections.delete(item.id);
      } else {
        throw new Error(`Sync failed with status: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to sync item ${item.id}`, err);
      await db.offline_inspections.update(item.id, { 
        status: 'queued', 
        retry_count: (item.retry_count || 0) + 1 
      });
    }
  }

  // Dispatch event so UI can update the sync tray
  window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
};
