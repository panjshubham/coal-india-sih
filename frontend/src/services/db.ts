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
  return db.add('pending_submissions', {
    payload,
    timestamp: nowIST(), // Store with +05:30 so display always shows IST correctly
    status: 'pending',
  });
};

export const getPendingSubmissions = async () => {
  const db = await getDB();
  return db.getAllFromIndex('pending_submissions', 'by-status', 'pending');
};

export const getPendingCount = async () => {
  const submissions = await getPendingSubmissions();
  return submissions.length;
};

export const removePendingSubmission = async (id: number) => {
  const db = await getDB();
  return db.delete('pending_submissions', id);
};
