import { supabase } from '../supabase';
import { getPendingSubmissions, removePendingSubmission } from './db';

// Helper to convert base64 back to Blob
const base64ToBlob = async (base64Data: string) => {
  const response = await fetch(base64Data);
  return response.blob();
};

export const processSyncQueue = async () => {
  if (!navigator.onLine) return;

  const pending = await getPendingSubmissions();
  if (pending.length === 0) return;

  let processedCount = 0;

  for (const item of pending) {
    const { id, payload } = item;
    if (!id) continue;

    try {
      let photoUrl = '';

      // Upload photo if it exists
      if (payload.photoBase64) {
        try {
          const blob = await base64ToBlob(payload.photoBase64);
          // try to infer extension from base64 string if possible, default to jpg
          const mimeType = blob.type || 'image/jpeg';
          const ext = mimeType.split('/')[1] || 'jpg';
          const fileName = `${Math.random()}.${ext}`;
          const filePath = `${payload.userId}/${fileName}`;

          const { error: uploadError, data } = await supabase.storage.from('photos').upload(filePath, blob, {
            contentType: mimeType
          });
          
          if (!uploadError && data) {
            const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
            photoUrl = publicUrl;
          }
        } catch (e) {
          console.warn('Sync photo upload failed, but continuing with sync process', e);
        }
      }

      // Normalize payload (NewInspection vs Inspections formats)
      const mine_id = payload.mineId || payload.mine_id || 1;
      const inspector_id = payload.userId || payload.inspector_id;
      const category = payload.category;
      const severity = payload.severity;
      const description = payload.description;
      const lat = payload.lat || payload.latitude;
      const lng = payload.lng || payload.longitude;

      // 1. Insert Inspection
      const { data: inspData, error: inspError } = await supabase.from('inspections').insert({
        mine_id: Number(mine_id),
        scheduled_date: new Date().toISOString(),
        status: 'completed',
        inspector_id: inspector_id,
        findings: description
      }).select('id').single();
      
      if (inspError) throw inspError;

      // 2. Insert Violation
      const { error: violError } = await supabase.from('violations').insert({
        inspection_id: inspData.id,
        mine_id: Number(mine_id),
        category: category,
        severity: severity === 'advisory' ? 'low' : severity === 'moderate' ? 'medium' : severity === 'critical' ? 'high' : severity,
        status: 'open',
        latitude: lat,
        longitude: lng,
        photo_url: photoUrl,
        description: description,
        regulation_ref: 'DGMS-SEC-4.2', 
      });

      if (violError) throw violError;

      // If success, remove from IDB
      await removePendingSubmission(id);
      processedCount++;

    } catch (err) {
      console.error(`Failed to sync submission ${id}`, err);
      // Keep it in IDB for next retry
    }
  }

  if (processedCount > 0) {
    window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
  }
};
