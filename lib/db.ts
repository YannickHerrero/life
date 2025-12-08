import Dexie, { type EntityTable } from 'dexie';
import type {
  JapaneseActivity,
  Food,
  MealEntry,
  SportActivity,
  WeightEntry,
  SyncMeta,
} from '@/types';

export class LifeDB extends Dexie {
  japaneseActivities!: EntityTable<JapaneseActivity, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  mealEntries!: EntityTable<MealEntry, 'id'>;
  sportActivities!: EntityTable<SportActivity, 'id'>;
  weightEntries!: EntityTable<WeightEntry, 'id'>;
  syncMeta!: EntityTable<SyncMeta, 'key'>;

  constructor() {
    super('LifeDB');

    this.version(1).stores({
      japaneseActivities: 'id, date, type, pendingSync, deletedAt',
      foods: 'id, name, pendingSync, deletedAt',
      mealEntries: 'id, date, foodId, mealType, pendingSync, deletedAt',
      sportActivities: 'id, date, sportType, pendingSync, deletedAt',
      weightEntries: 'id, date, pendingSync, deletedAt',
      syncMeta: 'key',
    });
  }
}

export const db = new LifeDB();

// Helper to generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to create a new syncable entity with defaults
export function createSyncableEntity() {
  const now = new Date();
  return {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    pendingSync: true,
  };
}

// Mark entity as updated and pending sync
export function markForSync<T extends { updatedAt: Date; pendingSync: boolean }>(
  entity: T
): T {
  return {
    ...entity,
    updatedAt: new Date(),
    pendingSync: true,
  };
}
