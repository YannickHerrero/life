import { db } from './db';
import {
  getSupabaseClient,
  Tables,
  toSupabaseRecord,
  fromSupabaseRecord,
} from './supabase';
import type {
  JapaneseActivity,
  Food,
  MealEntry,
  SportActivity,
  WeightEntry,
  Book,
  SyncableEntity,
} from '@/types';

const LAST_SYNC_KEY = 'lastSyncedAt';

// Get last sync timestamp
export async function getLastSyncTime(): Promise<Date | null> {
  const meta = await db.syncMeta.get(LAST_SYNC_KEY);
  if (meta?.value) {
    return new Date(meta.value as string);
  }
  return null;
}

// Update last sync timestamp
async function updateLastSyncTime(): Promise<void> {
  await db.syncMeta.put({
    key: LAST_SYNC_KEY,
    value: new Date().toISOString(),
  });
}

// Dexie table type for sync operations
type DexieTable<T> = {
  where: (field: string) => {
    equals: (val: string | number) => {
      toArray: () => Promise<T[]>;
      modify: (changes: Partial<T>) => Promise<number>;
    };
    anyOf: (vals: string[]) => {
      delete: () => Promise<number>;
    };
  };
  filter: (fn: (item: T) => boolean) => {
    toArray: () => Promise<T[]>;
  };
  bulkPut: (items: T[]) => Promise<unknown>;
};

// Generic push function for a table
async function pushTable<T extends SyncableEntity>(
  localTable: DexieTable<T>,
  supabaseTable: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get all pending items (use filter since booleans can't be indexed in IndexedDB)
  const pendingItems = await localTable.filter(item => item.pendingSync === true).toArray();

  if (pendingItems.length === 0) return;

  for (const item of pendingItems) {
    const record = toSupabaseRecord({ ...item, userId } as unknown as Record<string, unknown>);

    // Remove local-only fields
    delete record.pending_sync;

    if (item.deletedAt) {
      // Delete from Supabase
      await supabase.from(supabaseTable).delete().eq('id', item.id);
    } else {
      // Upsert to Supabase
      const { error } = await supabase
        .from(supabaseTable)
        .upsert(record, { onConflict: 'id' });

      if (error) {
        console.error(`Failed to sync ${supabaseTable}:`, error.message, error.details, error.hint, error.code);
        continue;
      }
    }

    // Mark as synced locally
    await localTable.where('id').equals(item.id).modify({ pendingSync: false } as Partial<T>);
  }
}

// Generic pull function for a table
async function pullTable<T extends SyncableEntity>(
  localTable: DexieTable<T>,
  supabaseTable: string,
  userId: string,
  since: Date | null
): Promise<void> {
  const supabase = getSupabaseClient();

  let query = supabase.from(supabaseTable).select('*').eq('user_id', userId);

  if (since) {
    query = query.gt('updated_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Failed to pull ${supabaseTable}:`, error);
    return;
  }

  if (!data || data.length === 0) return;

  // Convert and store locally
  const items: (T & { pendingSync: boolean })[] = data.map((record: Record<string, unknown>) => ({
    ...fromSupabaseRecord<T>(record),
    pendingSync: false,
  }));

  // Handle soft deletes - remove from local if deleted_at is set
  const deletedIds = items
    .filter((item: T) => item.deletedAt)
    .map((item: T) => item.id);

  if (deletedIds.length > 0) {
    await localTable.where('id').anyOf(deletedIds).delete();
  }

  // Upsert non-deleted items
  const activeItems = items.filter((item) => !item.deletedAt);
  if (activeItems.length > 0) {
    await localTable.bulkPut(activeItems);
  }
}

// Push all local changes to Supabase
export async function pushLocalChanges(userId: string): Promise<void> {
  await Promise.all([
    pushTable<Book>(db.books as unknown as DexieTable<Book>, Tables.BOOKS, userId),
    pushTable<JapaneseActivity>(db.japaneseActivities as unknown as DexieTable<JapaneseActivity>, Tables.JAPANESE_ACTIVITIES, userId),
    pushTable<Food>(db.foods as unknown as DexieTable<Food>, Tables.FOODS, userId),
    pushTable<MealEntry>(db.mealEntries as unknown as DexieTable<MealEntry>, Tables.MEAL_ENTRIES, userId),
    pushTable<SportActivity>(db.sportActivities as unknown as DexieTable<SportActivity>, Tables.SPORT_ACTIVITIES, userId),
    pushTable<WeightEntry>(db.weightEntries as unknown as DexieTable<WeightEntry>, Tables.WEIGHT_ENTRIES, userId),
  ]);
}

// Pull remote changes from Supabase
export async function pullRemoteChanges(userId: string, since: Date | null): Promise<void> {
  await Promise.all([
    pullTable<Book>(db.books as unknown as DexieTable<Book>, Tables.BOOKS, userId, since),
    pullTable<JapaneseActivity>(db.japaneseActivities as unknown as DexieTable<JapaneseActivity>, Tables.JAPANESE_ACTIVITIES, userId, since),
    pullTable<Food>(db.foods as unknown as DexieTable<Food>, Tables.FOODS, userId, since),
    pullTable<MealEntry>(db.mealEntries as unknown as DexieTable<MealEntry>, Tables.MEAL_ENTRIES, userId, since),
    pullTable<SportActivity>(db.sportActivities as unknown as DexieTable<SportActivity>, Tables.SPORT_ACTIVITIES, userId, since),
    pullTable<WeightEntry>(db.weightEntries as unknown as DexieTable<WeightEntry>, Tables.WEIGHT_ENTRIES, userId, since),
  ]);
}

// Full bidirectional sync
export async function syncAll(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const lastSync = await getLastSyncTime();

    // Push local changes first (so they're not overwritten)
    await pushLocalChanges(userId);

    // Pull remote changes
    await pullRemoteChanges(userId, lastSync);

    // Update last sync time
    await updateLastSyncTime();

    return { success: true };
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

// Check if sync is needed (24 hours since last sync)
export async function isSyncNeeded(): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  if (!lastSync) return true;

  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 24;
}

// Debounced sync trigger
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;

export function debouncedSync(userId: string): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncAll(userId);
    syncTimeout = null;
  }, SYNC_DEBOUNCE_MS);
}
