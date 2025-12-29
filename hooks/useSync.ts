'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import {
  syncAll,
  getLastSyncTime,
  isSyncNeeded,
  debouncedSync,
} from '@/lib/sync';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useSync() {
  const { user } = useAuth();
  const preloadAll = useAppStore((state) => state.preloadAll);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load last sync time on mount
  useEffect(() => {
    getLastSyncTime().then(setLastSynced);
  }, []);

  // Auto-sync on app open if needed
  useEffect(() => {
    if (!user) return;

    const checkAndSync = async () => {
      const needsSync = await isSyncNeeded();
      if (needsSync) {
        await performSync();
      }
    };

    checkAndSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const performSync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in' };

    setStatus('syncing');
    setError(null);

    const result = await syncAll(user.id);

    if (result.success) {
      // Refresh the store with newly synced data from IndexedDB
      await preloadAll();
      setStatus('success');
      const newLastSync = await getLastSyncTime();
      setLastSynced(newLastSync);
      // Reset to idle after a short delay
      setTimeout(() => setStatus('idle'), 2000);
      return { success: true };
    } else {
      setStatus('error');
      setError(result.error ?? 'Sync failed');
      return { success: false, error: result.error };
    }
  }, [user, preloadAll]);

  // Trigger debounced sync (for use after data input)
  const triggerSync = useCallback(() => {
    if (user) {
      debouncedSync(user.id);
    }
  }, [user]);

  return {
    status,
    lastSynced,
    error,
    sync: performSync,
    triggerSync,
  };
}
