import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import {
  subscribeToSyncStatus,
  flushOfflineQueue,
  SyncStatusState,
  getSyncStatus,
} from '../../services/offlineSync';

export const OfflineSyncIndicator: React.FC = () => {
  const [status, setStatus] = useState<SyncStatusState>(() => getSyncStatus());
  const [showSyncedToast, setShowSyncedToast] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const unsub = subscribeToSyncStatus((next) => {
      setStatus((prev) => {
        if (next.lastSyncedAt && next.lastSyncedAt !== prev.lastSyncedAt && next.lastSyncedCount > 0) {
          setShowSyncedToast(true);
          window.clearTimeout(timer);
          timer = window.setTimeout(() => setShowSyncedToast(false), 4000);
        }
        return next;
      });
    });

    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  if (status.isOnline && status.pendingCount === 0 && !status.isSyncing && !showSyncedToast) {
    return null;
  }

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-4 z-40 flex flex-col gap-2 pointer-events-auto">
      {!status.isOnline && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-600/95 backdrop-blur-md text-white px-3.5 py-2 text-xs font-semibold shadow-lg border border-amber-400/40">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Offline Mode · Cached data active
            {status.pendingCount > 0 ? ` (${status.pendingCount} queued)` : ''}
          </span>
        </div>
      )}

      {status.isOnline && (status.isSyncing || status.pendingCount > 0) && (
        <button
          type="button"
          onClick={() => flushOfflineQueue()}
          className="flex items-center gap-2 rounded-xl bg-emerald-800/95 backdrop-blur-md text-white px-3.5 py-2 text-xs font-semibold shadow-lg border border-emerald-500/40 cursor-pointer"
        >
          {status.isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <CloudUpload className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {status.isSyncing
              ? 'Syncing offline changes...'
              : `${status.pendingCount} pending change${status.pendingCount === 1 ? '' : 's'} · Tap to sync`}
          </span>
        </button>
      )}

      {status.isOnline && status.pendingCount === 0 && !status.isSyncing && showSyncedToast && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-700/95 backdrop-blur-md text-white px-3.5 py-2 text-xs font-semibold shadow-lg border border-emerald-400/40">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Synced {status.lastSyncedCount} offline update{status.lastSyncedCount === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
};
