import { registerSW } from 'virtual:pwa-register';
import {
  enqueueOfflineMutation,
  getPendingOfflineMutations,
  removeOfflineMutation,
  updateOfflineMutationRetry,
  OfflineMutationItem,
} from './localDb';

export interface SyncStatusState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedCount: number;
  lastSyncedAt: number | null;
  periodicSyncRegistered: boolean;
}

type SyncListener = (state: SyncStatusState) => void;
type RefreshCallback = () => void;

let currentState: SyncStatusState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedCount: 0,
  lastSyncedAt: null,
  periodicSyncRegistered: false,
};

const listeners = new Set<SyncListener>();
const refreshCallbacks = new Set<RefreshCallback>();
let swRegistration: ServiceWorkerRegistration | null = null;
let initialized = false;

function emitState(patch: Partial<SyncStatusState>) {
  currentState = { ...currentState, ...patch };
  for (const listener of listeners) {
    listener(currentState);
  }
}

export function getSyncStatus(): SyncStatusState {
  return currentState;
}

export function subscribeToSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => listeners.delete(listener);
}

export function subscribeToBackgroundRefresh(callback: RefreshCallback): () => void {
  refreshCallbacks.add(callback);
  return () => refreshCallbacks.delete(callback);
}

async function refreshPendingCount() {
  const items = await getPendingOfflineMutations();
  emitState({ pendingCount: items.length });
}

export async function registerBackgroundSyncTag(tag = 'hyba-offline-sync'): Promise<boolean> {
  try {
    const reg = swRegistration || (await navigator.serviceWorker?.ready);
    if (reg && 'sync' in reg) {
      await (reg as any).sync.register(tag);
      return true;
    }
  } catch {
    // Background Sync API not supported in this browser; online event listener handles fallback
  }
  return false;
}

export async function registerPeriodicBackgroundSync(): Promise<boolean> {
  try {
    const reg = swRegistration || (await navigator.serviceWorker?.ready);
    if (!reg || !('periodicSync' in reg)) return false;

    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (perm.state !== 'granted') return false;
      } catch {
        // Some browsers allow direct register attempt
      }
    }

    await (reg as any).periodicSync.register('hyba-portal-refresh', {
      minInterval: 12 * 60 * 60 * 1000, // 12 hours minimum
    });
    emitState({ periodicSyncRegistered: true });
    return true;
  } catch {
    return false;
  }
}

export async function queueOfflineAction(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown,
  label: string
): Promise<OfflineMutationItem> {
  const item = await enqueueOfflineMutation({ endpoint, method, body, label });
  await refreshPendingCount();
  await registerBackgroundSyncTag();
  return item;
}

export async function flushOfflineQueue(): Promise<number> {
  if (currentState.isSyncing) return 0;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

  const items = await getPendingOfflineMutations();
  if (items.length === 0) {
    emitState({ pendingCount: 0 });
    return 0;
  }

  emitState({ isSyncing: true });
  let synced = 0;

  const token = localStorage.getItem('hyba_jwt_token');

  for (const item of items) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(item.endpoint, {
        method: item.method,
        headers,
        credentials: 'include',
        body: item.body !== undefined ? JSON.stringify(item.body) : undefined,
      });

      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) {
        // Remove on success or permanent client validation error so queue doesn't jam
        await removeOfflineMutation(item.id);
        if (res.ok) synced++;
      } else {
        await updateOfflineMutationRetry(item.id, `HTTP ${res.status}`);
      }
    } catch (err: any) {
      await updateOfflineMutationRetry(item.id, err?.message || 'Network offline');
      break; // Stop flushing if connectivity dropped again
    }
  }

  const remaining = await getPendingOfflineMutations();
  emitState({
    isSyncing: false,
    pendingCount: remaining.length,
    lastSyncedCount: synced > 0 ? synced : currentState.lastSyncedCount,
    lastSyncedAt: synced > 0 ? Date.now() : currentState.lastSyncedAt,
  });

  if (synced > 0) {
    for (const cb of refreshCallbacks) {
      cb();
    }
  }

  return synced;
}

export function initPwaRuntime() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // 1. Register Workbox Service Worker via vite-plugin-pwa
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          swRegistration = registration;
          registerPeriodicBackgroundSync().catch(() => {});
          // Periodically check for SW updates every 30 minutes
          window.setInterval(() => {
            registration.update().catch(() => {});
          }, 30 * 60 * 1000);
        }
      },
      onRegisterError(err) {
        console.warn('[Hyba PWA] Service Worker registration notice:', err);
      },
    });

    // Listen to messages from Service Worker (background sync & periodic refresh)
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'HYBA_TRIGGER_QUEUE_FLUSH') {
        flushOfflineQueue().catch(() => {});
      } else if (data.type === 'HYBA_BG_SYNC_COMPLETED') {
        emitState({
          lastSyncedCount: data.syncedCount || 1,
          lastSyncedAt: data.timestamp || Date.now(),
        });
        for (const cb of refreshCallbacks) {
          cb();
        }
      } else if (data.type === 'HYBA_PERIODIC_REFRESH_DONE') {
        for (const cb of refreshCallbacks) {
          cb();
        }
      }
    });
  }

  // 2. Online / Offline transitions
  window.addEventListener('online', () => {
    emitState({ isOnline: true });
    flushOfflineQueue().catch(() => {});
  });

  window.addEventListener('offline', () => {
    emitState({ isOnline: false });
  });

  // 3. Fallback foreground refresh when returning to app after >5 minutes
  let lastHiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastHiddenAt = Date.now();
    } else if (document.visibilityState === 'visible') {
      if (navigator.onLine) {
        flushOfflineQueue().catch(() => {});
        if (lastHiddenAt && Date.now() - lastHiddenAt > 5 * 60 * 1000) {
          for (const cb of refreshCallbacks) {
            cb();
          }
        }
      }
    }
  });

  // 4. Initial pending count & attempt flush if online
  refreshPendingCount()
    .then(() => {
      if (navigator.onLine) {
        flushOfflineQueue().catch(() => {});
      }
    })
    .catch(() => {});
}
