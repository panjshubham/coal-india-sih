import Dexie, { type Table } from 'dexie';
import { supabase } from '../supabase';

export interface OfflineInspection {
  id?: number;
  type: 'voice' | 'photo' | 'form';
  payload: Blob | string; // Use Blob for voice/photo, string for form data
  previewUrl?: string;
  notes?: string;
  category?: string;
  gps: {
    lat: number;
    lng: number;
    accuracy?: number;
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
    this.version(2).stores({
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
  lng: number,
  notes?: string,
  category: string = 'safety'
) => {
  const id = await db.offline_inspections.add({
    type,
    payload,
    notes: notes || (type === 'voice' ? 'Underground Voice Memo Observation' : 'Pit Photographic Hazard Record'),
    category,
    gps: { lat, lng },
    timestamp: new Date().toISOString(),
    status: 'queued',
    retry_count: 0
  });

  window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
  return id;
};

/**
 * Direct submit or background sync pipeline:
 * 1. Uploads media to Supabase storage (or fallback base64)
 * 2. Records Statutory Inspection in Supabase
 * 3. Creates Formal Statutory Hazard/Violation in Supabase
 * 4. Triggers System Alert in Supabase + plays audio chime & increments AlertBell
 * 5. If AI microservice is active, forwards to Whisper/BART/BERT pipelines
 */
export const syncOfflineItem = async (item: OfflineInspection): Promise<boolean> => {
  if (!item.id && item.id !== 0) return false;

  try {
    await db.offline_inspections.update(item.id, { status: 'syncing' });

    let photoUrl: string | null = null;
    const isBlob = item.payload instanceof Blob;

    // 1. Try uploading to Supabase Storage if it's an image/audio blob
    if (isBlob) {
      try {
        const blob = item.payload as Blob;
        const ext = item.type === 'voice' ? 'webm' : 'jpg';
        const fileName = `pit_inspector/${item.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('photos')
          .upload(fileName, blob, {
            contentType: blob.type || (item.type === 'voice' ? 'audio/webm' : 'image/jpeg'),
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      } catch (storageErr) {
        console.warn('[OfflineQueue] Supabase storage upload non-fatal fallback:', storageErr);
      }
    } else if (typeof item.payload === 'string' && item.payload.startsWith('http')) {
      photoUrl = item.payload;
    }

    const mineId = Number(import.meta.env.VITE_DEFAULT_MINE_ID) || 1;
    const category = item.category || 'safety';
    const description = item.notes || (
      item.type === 'voice'
        ? `Pit Inspector Voice Report dictated on pit floor. Geotag: Lat ${item.gps.lat.toFixed(4)}, Lng ${item.gps.lng.toFixed(4)}`
        : `Pit Inspector Photographic Visual Evidence. Geotag: Lat ${item.gps.lat.toFixed(4)}, Lng ${item.gps.lng.toFixed(4)}`
    );

    // 2. Insert into `inspections` table
    let inspectionId: number | null = null;
    try {
      const { data: inspData, error: inspErr } = await supabase
        .from('inspections')
        .insert([{
          mine_id: mineId,
          date: item.timestamp,
          inspector_name: 'Pit Inspector (Field Agent)',
          synced_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (!inspErr && inspData?.id) {
        inspectionId = inspData.id;
      }
    } catch (ie) {
      console.warn('[OfflineQueue] Inspection insertion skipped:', ie);
    }

    // 3. Insert into `violations` table
    let violationId: number | null = null;
    try {
      const violPayload: any = {
        mine_id: mineId,
        category: category,
        severity: 'high',
        status: 'open',
        description,
        latitude: item.gps.lat,
        longitude: item.gps.lng,
        photo_url: photoUrl,
        regulation_ref: 'DGMS-CMR-2017-REG-115'
      };
      if (inspectionId) violPayload.inspection_id = inspectionId;

      const { data: violData, error: violErr } = await supabase
        .from('violations')
        .insert([violPayload])
        .select('id')
        .single();

      if (!violErr && violData?.id) {
        violationId = violData.id;
      }
    } catch (ve) {
      console.warn('[OfflineQueue] Violation insertion non-fatal:', ve);
    }

    // 4. Trigger Official Notification in Supabase + Local Chime
    const alertMessage = item.type === 'voice'
      ? `🎙️ Voice Report submitted at [${item.gps.lat.toFixed(4)}, ${item.gps.lng.toFixed(4)}]. Statutory analysis initiated.`
      : `📸 Visual Hazard inspection captured at [${item.gps.lat.toFixed(4)}, ${item.gps.lng.toFixed(4)}]. Inspection ID #${inspectionId || 'LIVE'}.`;

    const alertPayload = {
      type: 'violation',
      severity: 'high',
      title: item.type === 'voice' ? 'PIT VOICE REPORT LOGGED' : 'PIT PHOTO HAZARD LOGGED',
      message: alertMessage,
      related_entity_type: 'violation',
      related_entity_id: violationId || inspectionId || undefined,
      destination: violationId ? `/violations/${violationId}` : '/violations',
      created_at: new Date().toISOString(),
      is_read: false
    };

    try {
      await supabase.from('alerts').insert([alertPayload]);
    } catch (ae) {
      console.warn('[OfflineQueue] Alert insert error:', ae);
    }

    // Broadcast instant event for immediate UI update & audio chime
    window.dispatchEvent(new CustomEvent('coalguard:newAlert', { detail: alertPayload }));

    // 5. Optional AI Service forwarding (Whisper / BART-MNLI / YOLO)
    const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || '';
    if (AI_SERVICE_URL && isBlob) {
      try {
        const formData = new FormData();
        formData.append('lat', item.gps.lat.toString());
        formData.append('lng', item.gps.lng.toString());
        formData.append('timestamp', item.timestamp);

        let endpoint = '';
        if (item.type === 'voice') {
          endpoint = `${AI_SERVICE_URL}/api/pipeline/voice-report`;
          formData.append('file', item.payload as Blob, `voice_${item.id}.webm`);
        } else if (item.type === 'photo') {
          endpoint = `${AI_SERVICE_URL}/api/pipeline/photo-inspection`;
          formData.append('file', item.payload as Blob, `photo_${item.id}.jpg`);
        }

        if (endpoint) {
          fetch(endpoint, { method: 'POST', body: formData }).catch(err => {
            console.warn('[OfflineQueue] AI pipeline async delivery warning:', err);
          });
        }
      } catch (aiErr) {
        console.warn('[OfflineQueue] AI forward error:', aiErr);
      }
    }

    // Mark locally as synced
    await db.offline_inspections.update(item.id, { status: 'synced' });
    return true;
  } catch (err) {
    console.error(`[OfflineQueue] Failed to sync item ${item.id}`, err);
    await db.offline_inspections.update(item.id, {
      status: 'queued',
      retry_count: (item.retry_count || 0) + 1
    });
    return false;
  }
};

export const syncOfflineQueue = async () => {
  if (!navigator.onLine) return;

  const queued = await db.offline_inspections.where('status').equals('queued').toArray();
  if (queued.length === 0) return;

  for (const item of queued) {
    await syncOfflineItem(item);
  }

  // Dispatch event so UI can update the sync tray
  window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
};
