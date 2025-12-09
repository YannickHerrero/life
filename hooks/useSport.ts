'use client';

import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSyncableEntity, markForSync } from '@/lib/db';
import { useSync } from './useSync';
import { useAppStore } from '@/lib/store';
import type {
  SportActivity,
  SportActivityInput,
  SportType,
  PeriodStats,
} from '@/types';

export function useSport() {
  const { triggerSync } = useSync();

  // Get all activities (non-deleted)
  const activities = useLiveQuery(
    () =>
      db.sportActivities
        .filter((a) => !a.deletedAt)
        .reverse()
        .sortBy('date'),
    []
  );

  // Add a new activity
  const addActivity = async (input: SportActivityInput): Promise<void> => {
    const activity: SportActivity = {
      ...createSyncableEntity(),
      ...input,
    };

    // Optimistic update
    useAppStore.getState().addSportActivity(activity);

    await db.sportActivities.add(activity);
    triggerSync();
  };

  // Update an existing activity
  const updateActivity = async (
    id: string,
    updates: Partial<SportActivityInput>
  ): Promise<void> => {
    const existing = await db.sportActivities.get(id);
    if (!existing) return;

    const updated = markForSync({ ...existing, ...updates });
    // Optimistic update
    useAppStore.getState().updateSportActivity(updated);
    await db.sportActivities.put(updated);
    triggerSync();
  };

  // Soft delete an activity
  const deleteActivity = async (id: string): Promise<void> => {
    const existing = await db.sportActivities.get(id);
    if (!existing) return;

    // Optimistic update (remove from store immediately)
    useAppStore.getState().deleteSportActivity(id);

    const deleted = markForSync({ ...existing, deletedAt: new Date() });
    await db.sportActivities.put(deleted);
    triggerSync();
  };

  // Get activities for a specific date
  const getActivitiesForDate = async (date: string): Promise<SportActivity[]> => {
    return db.sportActivities
      .where('date')
      .equals(date)
      .filter((a) => !a.deletedAt)
      .toArray();
  };

  return {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    getActivitiesForDate,
  };
}

// Separate hook for sport stats
export function useSportStats() {
  const activities = useLiveQuery(
    () => db.sportActivities.filter((a) => !a.deletedAt).toArray(),
    []
  );

  // Calculate time stats for a specific sport type
  const getTimeStats = (sportType: SportType): PeriodStats => {
    if (!activities) {
      return { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 };
    }

    const filtered = activities.filter((a) => a.sportType === sportType);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let total = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let thisYear = 0;

    for (const activity of filtered) {
      const minutes = activity.durationMinutes;
      const activityDate = new Date(activity.date);

      total += minutes;

      if (activityDate >= startOfYear) thisYear += minutes;
      if (activityDate >= startOfMonth) thisMonth += minutes;
      if (activityDate >= startOfWeek) thisWeek += minutes;
    }

    return { total, thisWeek, thisMonth, thisYear };
  };

  // Get daily activity map for heatmap (running and street workout only)
  const dailyActivityMap = useMemo(() => {
    const map = new Map<string, { running: boolean; workout: boolean }>();
    if (!activities) return map;

    for (const activity of activities) {
      // Skip bike for heatmap
      if (activity.sportType === 'bike') continue;

      const current = map.get(activity.date) ?? { running: false, workout: false };

      if (activity.sportType === 'running') {
        current.running = true;
      } else if (activity.sportType === 'street_workout') {
        current.workout = true;
      }

      map.set(activity.date, current);
    }

    return map;
  }, [activities]);

  // Get weekly running distances for graph
  const getWeeklyRunningDistances = useCallback(
    (monthsBack: number = 3): { week: string; distance: number }[] => {
      if (!activities) return [];

      const runningActivities = activities.filter((a) => a.sportType === 'running');
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setMonth(now.getMonth() - monthsBack);

      // Group by week
      const weeklyDistances = new Map<string, number>();

      for (const activity of runningActivities) {
        const activityDate = new Date(activity.date);
        if (activityDate < cutoffDate) continue;

        // Get week start (Sunday)
        const weekStart = new Date(activityDate);
        weekStart.setDate(activityDate.getDate() - activityDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        const current = weeklyDistances.get(weekKey) ?? 0;
        weeklyDistances.set(weekKey, current + (activity.distanceKm ?? 0));
      }

      // Sort and format
      return Array.from(weeklyDistances.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, distance]) => ({
          week,
          distance: Math.round(distance * 10) / 10,
        }));
    },
    [activities]
  );

  return {
    activities,
    getTimeStats,
    dailyActivityMap,
    getWeeklyRunningDistances,
  };
}
