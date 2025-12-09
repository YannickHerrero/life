'use client';

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSyncableEntity, markForSync } from '@/lib/db';
import { useSync } from './useSync';
import { useAppStore } from '@/lib/store';
import type { WeightEntry } from '@/types';

export function useWeight() {
  const { triggerSync } = useSync();

  // Get all weight entries (non-deleted), sorted by date desc
  const entries = useLiveQuery(
    () =>
      db.weightEntries
        .filter((e) => !e.deletedAt)
        .reverse()
        .sortBy('date'),
    []
  );

  // Add or update weight for a specific date (upsert)
  const addOrUpdateWeight = async (weightKg: number, date: string): Promise<void> => {
    // Check if entry exists for this date
    const existing = await db.weightEntries
      .where('date')
      .equals(date)
      .filter((e) => !e.deletedAt)
      .first();

    if (existing) {
      // Update existing entry
      const updated = markForSync({ ...existing, weightKg });
      // Optimistic update
      useAppStore.getState().updateWeightEntry(updated);
      await db.weightEntries.put(updated);
    } else {
      // Create new entry
      const entry: WeightEntry = {
        ...createSyncableEntity(),
        weightKg,
        date,
      };
      // Optimistic update
      useAppStore.getState().addWeightEntry(entry);
      await db.weightEntries.add(entry);
    }

    triggerSync();
  };

  // Soft delete a weight entry
  const deleteEntry = async (id: string): Promise<void> => {
    const existing = await db.weightEntries.get(id);
    if (!existing) return;

    // Optimistic update (remove from store immediately)
    useAppStore.getState().deleteWeightEntry(id);

    const deleted = markForSync({ ...existing, deletedAt: new Date() });
    await db.weightEntries.put(deleted);
    triggerSync();
  };

  // Get weight for a specific date
  const getWeightForDate = useCallback(async (date: string): Promise<WeightEntry | undefined> => {
    return db.weightEntries
      .where('date')
      .equals(date)
      .filter((e) => !e.deletedAt)
      .first();
  }, []);

  // Get weight history for graphing
  const getWeightHistory = async (
    monthsBack: number = 3
  ): Promise<{ date: string; weight: number }[]> => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const entries = await db.weightEntries
      .where('date')
      .above(cutoffStr)
      .filter((e) => !e.deletedAt)
      .sortBy('date');

    return entries.map((e) => ({
      date: e.date,
      weight: e.weightKg,
    }));
  };

  // Get latest weight
  const getLatestWeight = useCallback(async (): Promise<WeightEntry | undefined> => {
    const sorted = await db.weightEntries
      .filter((e) => !e.deletedAt)
      .reverse()
      .sortBy('date');
    return sorted[0];
  }, []);

  return {
    entries,
    addOrUpdateWeight,
    deleteEntry,
    getWeightForDate,
    getWeightHistory,
    getLatestWeight,
  };
}
