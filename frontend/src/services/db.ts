import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { nowIST } from '../lib/dateUtils';

interface CoalGuardDB extends DBSchema {
  pending_submissions: {
    key: number;
    value: {
      id?: number;
      payload: any;
      timestamp: string;
      status: 'pending';
    };
    indexes: { 'by-status': string };
  };
}

const DB_NAME = 'coalguard-offline-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CoalGuardDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<CoalGuardDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_submissions')) {
          const store = db.createObjectStore('pending_submissions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
};

export const savePendingSubmission = async (payload: any) => {
  const db = await getDB();
  const id = await db.add('pending_submissions', {
    payload,
    timestamp: nowIST(), // Store with +05:30 so display always shows IST correctly
    status: 'pending',
  });
  window.dispatchEvent(new Event('coalguard:syncQueueUpdated'));
  return id;
};

export const savePendingAttendance = async (attendanceData: any) => {
  const payload = {
    type: 'attendance',
    ...attendanceData,
  };
  const id = await savePendingSubmission(payload);
  window.dispatchEvent(new CustomEvent('coalguard:attendanceLogged', { detail: payload }));
  window.dispatchEvent(new Event('coalguard:attendanceUpdated'));
  return id;
};

export const getPendingSubmissions = async () => {
  const db = await getDB();
  return db.getAllFromIndex('pending_submissions', 'by-status', 'pending');
};

export const getPendingAttendances = async () => {
  const subs = await getPendingSubmissions();
  return subs
    .filter(s => {
      const p = s.payload?.data || s.payload;
      return p?.type === 'attendance' || p?.submission_type === 'attendance' || p?.worker_id;
    })
    .map(s => {
      const p = s.payload?.data || s.payload;
      return {
        id: `offline-${s.id}`,
        db_id: s.id,
        worker_id: p.worker_id,
        worker_name: p.worker_name,
        designation: p.designation || 'Field Operative',
        shift: p.shift || 'Morning (Shift 1)',
        mine_id: p.mine_id,
        contractor_id: p.contractor_id,
        contractor_name: p.contractor_name,
        latitude: p.latitude || p.lat,
        longitude: p.longitude || p.lng,
        accuracy_meters: p.accuracy_meters || 2.4,
        status: p.status || 'present',
        verification_method: p.verification_method || 'geo_fenced_gate',
        photo_url: p.photo_url || p.photo_base64,
        timestamp: p.timestamp || s.timestamp,
        synced: false,
      };
    });
};

export const getPendingCount = async () => {
  const submissions = await getPendingSubmissions();
  return submissions.length;
};

export const removePendingSubmission = async (id: number) => {
  const db = await getDB();
  return db.delete('pending_submissions', id);
};

export const clearAllPendingSubmissions = async () => {
  const db = await getDB();
  return db.clear('pending_submissions');
};

