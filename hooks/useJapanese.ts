'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSyncableEntity, markForSync } from '@/lib/db';
import { useSync } from './useSync';
import { useAppStore } from '@/lib/store';
import type {
  JapaneseActivity,
  JapaneseActivityInput,
  JapaneseActivityType,
  StreakInfo,
  PeriodStats,
} from '@/types';
import { today, toDateString } from '@/types';

export function useJapanese() {
  const { triggerSync } = useSync();

  // Get all activities (non-deleted)
  const activities = useLiveQuery(
    () =>
      db.japaneseActivities
        .filter((a) => !a.deletedAt)
        .reverse()
        .sortBy('date'),
    []
  );

  // Add a new activity
  const addActivity = async (input: JapaneseActivityInput): Promise<void> => {
    const activity: JapaneseActivity = {
      ...createSyncableEntity(),
      ...input,
    };

    // Optimistic update
    useAppStore.getState().addJapaneseActivity(activity);

    await db.japaneseActivities.add(activity);

    // If this is a reading activity with a book, update the book's total time and start date
    if (input.type === 'reading' && input.bookId) {
      const book = await db.books.get(input.bookId);
      if (book) {
        const updatedBook = markForSync({
          ...book,
          totalReadingTimeMinutes: book.totalReadingTimeMinutes + input.durationMinutes,
          // Set startedAt on first reading session
          startedAt: book.startedAt ?? new Date(),
        });
        // Optimistic update for book
        useAppStore.getState().updateBook(updatedBook);
        await db.books.put(updatedBook);
      }
    }

    triggerSync();
  };

  // Update an existing activity
  const updateActivity = async (
    id: string,
    updates: Partial<JapaneseActivityInput>
  ): Promise<void> => {
    const existing = await db.japaneseActivities.get(id);
    if (!existing) return;

    const updated = markForSync({ ...existing, ...updates });
    // Optimistic update
    useAppStore.getState().updateJapaneseActivity(updated);
    await db.japaneseActivities.put(updated);
    triggerSync();
  };

  // Soft delete an activity
  const deleteActivity = async (id: string): Promise<void> => {
    const existing = await db.japaneseActivities.get(id);
    if (!existing) return;

    // Optimistic update (remove from store immediately)
    useAppStore.getState().deleteJapaneseActivity(id);

    const deleted = markForSync({ ...existing, deletedAt: new Date() });
    await db.japaneseActivities.put(deleted);
    triggerSync();
  };

  // Get activities for a specific date
  const getActivitiesForDate = async (date: string): Promise<JapaneseActivity[]> => {
    return db.japaneseActivities
      .where('date')
      .equals(date)
      .filter((a) => !a.deletedAt)
      .toArray();
  };

  // Get activities by type
  const getActivitiesByType = async (
    type: JapaneseActivityType
  ): Promise<JapaneseActivity[]> => {
    return db.japaneseActivities
      .where('type')
      .equals(type)
      .filter((a) => !a.deletedAt)
      .toArray();
  };

  return {
    activities,
    addActivity,
    updateActivity,
    deleteActivity,
    getActivitiesForDate,
    getActivitiesByType,
  };
}

// Separate hook for stats (can be heavy computation)
export function useJapaneseStats() {
  const activities = useLiveQuery(
    () => db.japaneseActivities.filter((a) => !a.deletedAt).toArray(),
    []
  );

  const calculateStreaks = (): StreakInfo => {
    if (!activities || activities.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique dates with activity
    const activeDates = new Set(activities.map((a) => a.date));
    const sortedDates = Array.from(activeDates).sort().reverse();

    if (sortedDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Calculate current streak
    let currentStreak = 0;
    const todayStr = today();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = toDateString(yesterdayDate);

    // Check if today or yesterday has activity (streak can continue)
    if (activeDates.has(todayStr) || activeDates.has(yesterdayStr)) {
      const startDate = activeDates.has(todayStr) ? todayStr : yesterdayStr;
      let checkDate = new Date(startDate);

      while (activeDates.has(toDateString(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates.reverse()) {
      const currentDate = new Date(dateStr);

      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const dayDiff = Math.round(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }

      prevDate = currentDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  };

  const calculateFlashcardStats = (): PeriodStats => {
    if (!activities) {
      return { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 };
    }

    const flashcardActivities = activities.filter((a) => a.type === 'flashcards');
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

    for (const activity of flashcardActivities) {
      const cards = activity.newCards ?? 0;
      const activityDate = new Date(activity.date);

      total += cards;

      if (activityDate >= startOfYear) thisYear += cards;
      if (activityDate >= startOfMonth) thisMonth += cards;
      if (activityDate >= startOfWeek) thisWeek += cards;
    }

    return { total, thisWeek, thisMonth, thisYear };
  };

  const calculateTimeStats = (type?: JapaneseActivityType): PeriodStats => {
    if (!activities) {
      return { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 };
    }

    const filtered = type
      ? activities.filter((a) => a.type === type)
      : activities;

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

  // Calculate time per day for heatmap
  const getDailyTimeMap = (): Map<string, number> => {
    const map = new Map<string, number>();
    if (!activities) return map;

    for (const activity of activities) {
      const current = map.get(activity.date) ?? 0;
      map.set(activity.date, current + activity.durationMinutes);
    }

    return map;
  };

  return {
    activities,
    streaks: calculateStreaks(),
    flashcardStats: calculateFlashcardStats(),
    timeStats: calculateTimeStats(),
    getTimeStatsByType: calculateTimeStats,
    dailyTimeMap: getDailyTimeMap(),
  };
}
