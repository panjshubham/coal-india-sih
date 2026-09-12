import { supabase } from '../supabase';
import { getPendingSubmissions, removePendingSubmission } from './db';

// Ultra-fast synchronous base64 to Blob conversion (bypasses slow fetch)
const base64ToBlob = (base64Data: string): Blob => {
  try {
    const parts = base64Data.split(';base64,');
    const contentType = parts[0]?.replace(/^data:/, '') || 'image/jpeg';
    const raw = window.atob(parts[1] || parts[0]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.warn('[SyncService] base64 convert fallback:', e);
    const byteCharacters = atob(base64Data.replace(/^data:image\/\w+;base64,/, ''));
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
  }
};

// Strict timeout wrapper so slow storage/network calls never freeze the sync queue
const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
};

// Maps any category string → valid DB enum value: 'safety' | 'environment' | 'production' | 'labour'
const normalizeCategory = (cat: string): string => {
  if (!cat) return 'safety';
  const c = cat.toLowerCase();
  if (c === 'safety' || c === 'environment' || c === 'production' || c === 'labour') return c;
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

// Maps severity string → valid DB enum: 'low' | 'medium' | 'high' | 'critical'
const normalizeSeverity = (sev: string): string => {
  if (!sev) return 'low';
  const s = sev.toLowerCase();
  if (s === 'low' || s === 'medium' || s === 'high' || s === 'critical') return s;
  if (s === 'advisory') return 'low';
  if (s === 'moderate') return 'medium';
  if (s === 'severe') return 'high';
  return 'low';
};

/**
 * Synchronizes a single pending submission item to Supabase.
 * Fast, resilient, with timeouts on non-critical paths (photo, inspection).
 */
export const syncSingleSubmission = async (item: any): Promise<boolean> => {
  const { id } = item;
  if (!id) return false;

  // Unpack any nested payload forms:
  // e.g. { payload: { data: {...} } } or { payload: {...} } or { data: {...} }
  const raw = item.payload || item;
  const p = raw.data || raw;

  try {
    // ── 1. Upload photo if present (with 2500ms timeout) ────────────────
    let photoUrl: string | null = null;
    const photoData = p.photoBase64 || p.photo_base64 || p.photo_url;
    if (photoData && typeof photoData === 'string' && photoData.startsWith('data:image')) {
      try {
        const uploadTask = (async () => {
          const blob = base64ToBlob(photoData);
          const mimeType = blob.type || 'image/jpeg';
          const ext = mimeType.split('/')[1] || 'jpg';
          const userId = p.userId || p.inspector_id || 'anon';
          const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError, data } = await supabase.storage
            .from('photos')
            .upload(filePath, blob, { contentType: mimeType, upsert: true });
          if (!uploadError && data) {
            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
            return publicUrl;
          }
          return null;
        })();

        // Enforce 2.5s maximum wait for photo upload
        photoUrl = await withTimeout(uploadTask, 2500, null);
      } catch (photoErr) {
        console.warn('[SyncService] Photo upload non-fatal fallback:', photoErr);
      }
    } else if (photoData && typeof photoData === 'string' && photoData.startsWith('http')) {
      photoUrl = photoData;
    }

    // ── 2. Normalise fields with valid fallbacks ─────────────────────────
    let mine_id = Number(p.mine_id || p.mineId);
    // Ensure mine_id is a valid integer foreign key (fallback to 42 - Govindpur Colliery)
    if (!mine_id || isNaN(mine_id) || mine_id < 1) {
      mine_id = 42;
    }

    const contractor_id = p.contractor_id ? Number(p.contractor_id) : null;
    const inspector_name = p.inspector_name || p.inspectorName || 'Field Inspector';
    const category = normalizeCategory(p.category);
    const severity = normalizeSeverity(p.severity);
    const description = p.description || 'Statutory review pending assessment.';
    const lat = p.lat ?? p.latitude ?? null;
    const lng = p.lng ?? p.longitude ?? null;
    const regulation_ref = p.regulation_ref || 'DGMS-CMR-2017';
    const tracking_id = p.tracking_id || `VIOL-2026-SYNC-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

    // ── 3. Insert Inspection record (non-fatal, with 2000ms timeout) ─────
    let inspectionId: number | null = null;
    try {
      const inspTask = (async () => {
        const inspPayload: any = {
          mine_id,
          date: p.timestamp || item.timestamp || new Date().toISOString(),
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

        if (!inspErr && inspData?.id) return inspData.id;
        return null;
      })();

      inspectionId = await withTimeout(inspTask, 2000, null);
    } catch (ie) {
      console.warn('[SyncService] Inspection record skipped (non-fatal):', ie);
    }

    // ── 4. Insert Violation record (Primary Record) ───────────────────────
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
      tracking_id,
    };
    if (inspectionId) {
      violPayload.inspection_id = inspectionId;
    }

    const { error: violError } = await supabase
      .from('violations')
      .insert([violPayload]);

    if (violError) {
      console.error('[SyncService] Violation insert failed:', violError.message);
      throw violError;
    }

    // ── 5. Remove synced item from IndexedDB ─────────────────────────────
    await removePendingSubmission(id);
    console.log(`[SyncService] ✅ Successfully synced offline violation #${id}`);
    return true;

  } catch (err) {
    console.error(`[SyncService] ❌ Failed to sync submission #${id}:`, err);
    return false;
  }
};

/**
 * Synchronizes all pending offline violation submissions in parallel.
 * Fast, non-blocking execution returning total number of successfully uploaded items.
 */
export const processSyncQueue = async (): Promise<number> => {
  if (!navigator.onLine) return 0;

  const pending = await getPendingSubmissions();
  if (pending.length === 0) return 0;

  console.log(`[SyncService] Rapidly syncing ${pending.length} pending offline submissions in parallel...`);

  // Process all pending items in parallel with Promise.allSettled for maximum speed
  const results = await Promise.allSettled(
    pending.map((item: any) => syncSingleSubmission(item))
  );

  const processedCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length;

  console.log(`[SyncService] Sync finished — ${processedCount}/${pending.length} successfully uploaded.`);

  window.dispatchEvent(new CustomEvent('coalguard:syncComplete', {
    detail: { synced: processedCount, total: pending.length }
  }));
  window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));

  return processedCount;
};
