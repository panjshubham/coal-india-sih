import { supabase } from '../supabase';
import { getPendingSubmissions, removePendingSubmission } from './db';

// Helper to convert base64 back to Blob for photo upload
const base64ToBlob = async (base64Data: string): Promise<Blob> => {
  const response = await fetch(base64Data);
  return response.blob();
};

// Maps any category string → valid DB enum value
const normalizeCategory = (cat: string): string => {
  if (!cat) return 'safety';
  const c = cat.toLowerCase();
  if (c === 'safety' || c === 'environment' || c === 'production' || c === 'labour') return c;
  // Map verbose labels from NewInspection
  if (c.includes('ventilation') || c.includes('methane') || c.includes('explosive') ||
      c.includes('blast') || c.includes('haul') || c.includes('slope') ||
      c.includes('bench') || c.includes('overburden') || c.includes('ppe') ||
      c.includes('safety')) return 'safety';
  if (c.includes('groundwater') || c.includes('drainage') || c.includes('environment') ||
      c.includes('air') || c.includes('water')) return 'environment';
  if (c.includes('labour') || c.includes('worker') || c.includes('wage')) return 'labour';
  if (c.includes('production') || c.includes('logistics')) return 'production';
  return 'safety';
};

// Maps severity string → valid DB enum: 'low' | 'medium' | 'high'
const normalizeSeverity = (sev: string): string => {
  if (!sev) return 'low';
  const s = sev.toLowerCase();
  if (s === 'low' || s === 'medium' || s === 'high') return s;
  if (s === 'advisory') return 'low';
  if (s === 'moderate') return 'medium';
  if (s === 'critical' || s === 'severe') return 'high';
  return 'low';
};

export const processSyncQueue = async (): Promise<number> => {
  if (!navigator.onLine) return 0;

  const pending = await getPendingSubmissions();
  if (pending.length === 0) return 0;

  let processedCount = 0;
  console.log(`[SyncService] Processing ${pending.length} pending offline submissions...`);

  for (const item of pending) {
    const { id, payload } = item;
    if (!id) continue;

    try {
      // ── Upload photo if present ──────────────────────────────────────────
      let photoUrl: string | null = null;
      if (payload.photoBase64) {
        try {
          const blob = await base64ToBlob(payload.photoBase64);
          const mimeType = blob.type || 'image/jpeg';
          const ext = mimeType.split('/')[1] || 'jpg';
          const userId = payload.userId || payload.inspector_id || 'anon';
          const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError, data } = await supabase.storage
            .from('photos')
            .upload(filePath, blob, { contentType: mimeType });
          if (!uploadError && data) {
            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
            photoUrl = publicUrl;
          }
        } catch (e) {
          console.warn('[SyncService] Photo upload failed (non-fatal):', e);
        }
      }

      // ── Normalise payload fields ─────────────────────────────────────────
      const mine_id = Number(payload.mine_id || payload.mineId);
      const contractor_id = payload.contractor_id ? Number(payload.contractor_id) : null;
      const inspector_name = payload.inspector_name || payload.inspectorName || 'Field Inspector';
      const category = normalizeCategory(payload.category);
      const severity = normalizeSeverity(payload.severity);
      const description = payload.description || '';
      const lat = payload.lat ?? payload.latitude ?? null;
      const lng = payload.lng ?? payload.longitude ?? null;
      const regulation_ref = payload.regulation_ref || 'DGMS-OFFLINE-SYNC';

      // ── 1. Insert Inspection (non-fatal) ─────────────────────────────────
      let inspectionId: number | null = null;
      try {
        const inspPayload: any = {
          mine_id,
          date: payload.timestamp || new Date().toISOString(),
          inspector_name,
          synced_at: new Date().toISOString()
        };
        if (contractor_id) {
          inspPayload.contractor_id = contractor_id;
        }

        const { data: inspData, error: inspErr } = await supabase
          .from('inspections')
          .insert([inspPayload])
          .select('id')
          .single();

        if (!inspErr && inspData?.id) {
          inspectionId = inspData.id;
        } else if (inspErr) {
          console.warn('[SyncService] Inspection insert failed (non-fatal):', inspErr.message);
        }
      } catch (ie) {
        console.warn('[SyncService] Inspection insert exception (non-fatal):', ie);
      }

      // ── 2. Insert Violation (primary record) ─────────────────────────────
      const violPayload: any = {
        mine_id,
        category,
        severity,
        status: 'open',
        description,
        latitude: lat !== null ? Number(lat) : null,
        longitude: lng !== null ? Number(lng) : null,
        photo_url: photoUrl,
        regulation_ref,
      };
      if (inspectionId) {
        violPayload.inspection_id = inspectionId;
      }

      // Note: do NOT pass `timestamp` column as violations table uses created_at with default now()
      const { error: violError } = await supabase
        .from('violations')
        .insert([violPayload]);

      if (violError) {
        console.error('[SyncService] Violation insert failed:', violError.message, violError.details);
        throw violError;
      }

      // ── 3. Remove from IDB on success ────────────────────────────────────
      await removePendingSubmission(id);
      processedCount++;
      console.log(`[SyncService] ✅ Synced offline submission #${id}`);

    } catch (err) {
      console.error(`[SyncService] ❌ Failed to sync submission #${id}:`, err);
      // Keep in IDB for next retry — do not throw
    }
  }

  if (processedCount > 0) {
    console.log(`[SyncService] Sync complete — ${processedCount}/${pending.length} uploaded`);
    window.dispatchEvent(new CustomEvent('coalguard:syncComplete', {
      detail: { synced: processedCount, total: pending.length }
    }));
    window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
  }

  return processedCount;
};
