import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  UserProfile,
  Student,
  Teacher,
  ClassBatch,
  Campus,
  HifzRecord,
  TeacherEvaluation,
  Announcement,
  CollegeEvent,
  TimetableSlot,
  FeedbackConfig,
  MyFeedbackStatusResponse,
} from '../types';

export interface PersistentSessionRecord {
  user: UserProfile;
  biometricLockEnabled: boolean;
  biometricCredentialId?: string;
  biometricPromptDismissed?: boolean;
  lastActiveTab: string;
  updatedAt: number;
}

export interface PortalDataSnapshot {
  key: string;
  students?: Student[];
  teachers?: Teacher[];
  classes?: ClassBatch[];
  campuses?: Campus[];
  hifzRecords?: HifzRecord[];
  evaluations?: TeacherEvaluation[];
  announcements?: Announcement[];
  events?: CollegeEvent[];
  timetableSlots?: TimetableSlot[];
  feedbackConfig?: FeedbackConfig | null;
  myFeedbackStatus?: MyFeedbackStatusResponse | null;
  allowStudentProfileEdit?: boolean;
  updatedAt: number;
}

export interface OfflineMutationItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  label: string;
  createdAt: number;
  retries: number;
  lastError?: string;
}

interface EncryptedEnvelope {
  id: string;
  encrypted: boolean;
  iv?: string;
  ciphertext?: string;
  plaintext?: string;
  updatedAt: number;
}

interface HybaDBSchema extends DBSchema {
  cryptoKeys: {
    key: string;
    value: CryptoKey;
  };
  session: {
    key: string;
    value: EncryptedEnvelope;
  };
  portalCache: {
    key: string;
    value: PortalDataSnapshot;
  };
  offlineQueue: {
    key: string;
    value: OfflineMutationItem;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'hyba-pwa-db';
const DB_VERSION = 1;
const SESSION_RECORD_KEY = 'active_session';
const MASTER_KEY_ID = 'device_session_aes_key';

let dbPromise: Promise<IDBPDatabase<HybaDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<HybaDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<HybaDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cryptoKeys')) {
          db.createObjectStore('cryptoKeys');
        }
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('portalCache')) {
          db.createObjectStore('portalCache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' });
          queueStore.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const ab = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(ab);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateEncryptionKey(db: IDBPDatabase<HybaDBSchema>): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null;
  }
  try {
    const existing = await db.get('cryptoKeys', MASTER_KEY_ID);
    if (existing) return existing;

    const generated = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // Non-extractable device-bound key
      ['encrypt', 'decrypt']
    );
    await db.put('cryptoKeys', generated, MASTER_KEY_ID);
    return generated;
  } catch {
    return null;
  }
}

export async function saveEncryptedSession(record: PersistentSessionRecord): Promise<void> {
  try {
    const db = await getDb();
    const json = JSON.stringify(record);
    const key = await getOrCreateEncryptionKey(db);

    if (key && window.crypto?.subtle) {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(json);
      const cipherBuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

      await db.put('session', {
        id: SESSION_RECORD_KEY,
        encrypted: true,
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
        updatedAt: Date.now(),
      });
    } else {
      await db.put('session', {
        id: SESSION_RECORD_KEY,
        encrypted: false,
        plaintext: json,
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('[LocalDB] Could not save encrypted session:', err);
  }
}

export async function loadEncryptedSession(): Promise<PersistentSessionRecord | null> {
  try {
    const db = await getDb();
    const envelope = await db.get('session', SESSION_RECORD_KEY);
    if (!envelope) return null;

    if (envelope.encrypted && envelope.iv && envelope.ciphertext) {
      const key = await getOrCreateEncryptionKey(db);
      if (!key || !window.crypto?.subtle) return null;

      const decryptedBuf = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
        key,
        base64ToBytes(envelope.ciphertext)
      );
      const json = new TextDecoder().decode(decryptedBuf);
      return JSON.parse(json) as PersistentSessionRecord;
    }

    if (envelope.plaintext) {
      return JSON.parse(envelope.plaintext) as PersistentSessionRecord;
    }
    return null;
  } catch (err) {
    console.warn('[LocalDB] Could not decrypt session, clearing stale envelope:', err);
    return null;
  }
}

export async function updateEncryptedSessionPatch(
  patch: Partial<PersistentSessionRecord>
): Promise<PersistentSessionRecord | null> {
  const current = await loadEncryptedSession();
  if (!current) return null;
  const updated: PersistentSessionRecord = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  await saveEncryptedSession(updated);
  return updated;
}

export async function clearEncryptedSession(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('session', SESSION_RECORD_KEY);
  } catch (err) {
    console.warn('[LocalDB] Could not clear session:', err);
  }
}

export function buildPortalCacheKey(userId: string, campusId?: string): string {
  return `portal:${userId}:${campusId || 'all'}`;
}

export async function savePortalSnapshot(
  userId: string,
  campusId: string | undefined,
  snapshot: Omit<PortalDataSnapshot, 'key' | 'updatedAt'>
): Promise<void> {
  try {
    const db = await getDb();
    const key = buildPortalCacheKey(userId, campusId);
    const existing = await db.get('portalCache', key);
    await db.put('portalCache', {
      ...(existing || {}),
      ...snapshot,
      key,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[LocalDB] Could not persist portal snapshot:', err);
  }
}

export async function loadPortalSnapshot(
  userId: string,
  campusId?: string
): Promise<PortalDataSnapshot | null> {
  try {
    const db = await getDb();
    const key = buildPortalCacheKey(userId, campusId);
    return (await db.get('portalCache', key)) || null;
  } catch (err) {
    console.warn('[LocalDB] Could not read portal snapshot:', err);
    return null;
  }
}

export async function clearAllPortalCaches(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear('portalCache');
  } catch (err) {
    console.warn('[LocalDB] Could not clear portal cache:', err);
  }
}

// Offline Background Sync Queue (IndexedDB-backed)
export async function enqueueOfflineMutation(
  item: Omit<OfflineMutationItem, 'id' | 'createdAt' | 'retries'>
): Promise<OfflineMutationItem> {
  const db = await getDb();
  const entry: OfflineMutationItem = {
    ...item,
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  await db.put('offlineQueue', entry);
  return entry;
}

export async function getPendingOfflineMutations(): Promise<OfflineMutationItem[]> {
  try {
    const db = await getDb();
    return await db.getAllFromIndex('offlineQueue', 'by-createdAt');
  } catch {
    return [];
  }
}

export async function removeOfflineMutation(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('offlineQueue', id);
  } catch {
    // ignore
  }
}

export async function updateOfflineMutationRetry(id: string, lastError: string): Promise<void> {
  try {
    const db = await getDb();
    const item = await db.get('offlineQueue', id);
    if (!item) return;
    item.retries += 1;
    item.lastError = lastError;
    await db.put('offlineQueue', item);
  } catch {
    // ignore
  }
}
