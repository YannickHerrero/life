'use client';

import { create } from 'zustand';
import { db } from '@/lib/db';
import type {
  JapaneseActivity,
  SportActivity,
  MealEntry,
  Food,
  WeightEntry,
  Book,
  StreakInfo,
  PeriodStats,
  MacroTotals,
  SportType,
} from '@/types';
import { today, toDateString } from '@/types';

// Stats computation helpers
function computeStreaks(activities: JapaneseActivity[]): StreakInfo {
  if (activities.length === 0) {
    return { current: 0, longest: 0 };
  }

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

  if (activeDates.has(todayStr) || activeDates.has(yesterdayStr)) {
    const startDate = activeDates.has(todayStr) ? todayStr : yesterdayStr;
    const checkDate = new Date(startDate);

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
}

function computePeriodStats(activities: { date: string; durationMinutes: number }[]): PeriodStats {
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

  for (const activity of activities) {
    const minutes = activity.durationMinutes;
    const activityDate = new Date(activity.date);

    total += minutes;

    if (activityDate >= startOfYear) thisYear += minutes;
    if (activityDate >= startOfMonth) thisMonth += minutes;
    if (activityDate >= startOfWeek) thisWeek += minutes;
  }

  return { total, thisWeek, thisMonth, thisYear };
}

function computeFlashcardStats(activities: JapaneseActivity[]): PeriodStats {
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
}

function computeDailyTimeMap(activities: JapaneseActivity[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const activity of activities) {
    const current = map.get(activity.date) ?? 0;
    map.set(activity.date, current + activity.durationMinutes);
  }
  return map;
}

function computeSportTimeStats(activities: SportActivity[], sportType: SportType): PeriodStats {
  const filtered = activities.filter((a) => a.sportType === sportType);
  return computePeriodStats(filtered);
}

function computeSportDailyMap(activities: SportActivity[]): Map<string, { running: boolean; workout: boolean }> {
  const map = new Map<string, { running: boolean; workout: boolean }>();
  for (const activity of activities) {
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
}

function computeWeeklyAverages(mealEntries: MealEntry[], foods: Food[]): MacroTotals {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const weekEntries = mealEntries.filter((m) => new Date(m.date) >= startOfWeek);

  const dailyTotals = new Map<string, MacroTotals>();

  for (const entry of weekEntries) {
    const food = foodMap.get(entry.foodId);
    if (!food) continue;

    const multiplier = entry.quantityGrams / 100;
    const current = dailyTotals.get(entry.date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };

    dailyTotals.set(entry.date, {
      calories: current.calories + food.caloriesPer100g * multiplier,
      protein: current.protein + food.proteinPer100g * multiplier,
      carbs: current.carbs + food.carbsPer100g * multiplier,
      fat: current.fat + food.fatPer100g * multiplier,
    });
  }

  const daysWithData = dailyTotals.size || 1;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const daily of dailyTotals.values()) {
    totalCalories += daily.calories;
    totalProtein += daily.protein;
    totalCarbs += daily.carbs;
    totalFat += daily.fat;
  }

  return {
    calories: Math.round(totalCalories / daysWithData),
    protein: Math.round((totalProtein / daysWithData) * 10) / 10,
    carbs: Math.round((totalCarbs / daysWithData) * 10) / 10,
    fat: Math.round((totalFat / daysWithData) * 10) / 10,
  };
}

// Store types
interface JapaneseStats {
  streaks: StreakInfo;
  flashcardStats: PeriodStats;
  timeStats: PeriodStats;
  dailyTimeMap: Map<string, number>;
}

interface SportStats {
  runningStats: PeriodStats;
  workoutStats: PeriodStats;
  bikeStats: PeriodStats;
  dailyActivityMap: Map<string, { running: boolean; workout: boolean }>;
}

interface AppStore {
  // Loading state
  isLoading: boolean;
  isReady: boolean;

  // Raw data
  japaneseActivities: JapaneseActivity[];
  sportActivities: SportActivity[];
  mealEntries: MealEntry[];
  foods: Food[];
  weightEntries: WeightEntry[];
  books: Book[];

  // Computed stats
  japaneseStats: JapaneseStats;
  sportStats: SportStats;
  weeklyAverages: MacroTotals;

  // Actions
  preloadAll: () => Promise<void>;
  recomputeJapaneseStats: () => void;
  recomputeSportStats: () => void;
  recomputeNutritionStats: () => void;

  // Optimistic update actions
  addJapaneseActivity: (activity: JapaneseActivity) => void;
  updateJapaneseActivity: (activity: JapaneseActivity) => void;
  deleteJapaneseActivity: (id: string) => void;
  addSportActivity: (activity: SportActivity) => void;
  updateSportActivity: (activity: SportActivity) => void;
  deleteSportActivity: (id: string) => void;
  addMealEntry: (entry: MealEntry) => void;
  updateMealEntry: (entry: MealEntry) => void;
  deleteMealEntry: (id: string) => void;
  addFood: (food: Food) => void;
  updateFood: (food: Food) => void;
  addWeightEntry: (entry: WeightEntry) => void;
  updateWeightEntry: (entry: WeightEntry) => void;
  deleteWeightEntry: (id: string) => void;
  addBook: (book: Book) => void;
  updateBook: (book: Book) => void;
  deleteBook: (id: string) => void;
}

const defaultJapaneseStats: JapaneseStats = {
  streaks: { current: 0, longest: 0 },
  flashcardStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  timeStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  dailyTimeMap: new Map(),
};

const defaultSportStats: SportStats = {
  runningStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  workoutStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  bikeStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  dailyActivityMap: new Map(),
};

const defaultWeeklyAverages: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  isLoading: false,
  isReady: false,

  japaneseActivities: [],
  sportActivities: [],
  mealEntries: [],
  foods: [],
  weightEntries: [],
  books: [],

  japaneseStats: defaultJapaneseStats,
  sportStats: defaultSportStats,
  weeklyAverages: defaultWeeklyAverages,

  // Preload all data
  preloadAll: async () => {
    set({ isLoading: true });

    try {
      // Fetch all data in parallel
      const [
        japaneseActivities,
        sportActivities,
        mealEntries,
        foods,
        weightEntries,
        books,
      ] = await Promise.all([
        db.japaneseActivities.filter((a) => !a.deletedAt).toArray(),
        db.sportActivities.filter((a) => !a.deletedAt).toArray(),
        db.mealEntries.filter((m) => !m.deletedAt).toArray(),
        db.foods.filter((f) => !f.deletedAt).toArray(),
        db.weightEntries.filter((e) => !e.deletedAt).toArray(),
        db.books.filter((b) => !b.deletedAt).toArray(),
      ]);

      // Compute stats
      const japaneseStats: JapaneseStats = {
        streaks: computeStreaks(japaneseActivities),
        flashcardStats: computeFlashcardStats(japaneseActivities),
        timeStats: computePeriodStats(japaneseActivities),
        dailyTimeMap: computeDailyTimeMap(japaneseActivities),
      };

      const sportStats: SportStats = {
        runningStats: computeSportTimeStats(sportActivities, 'running'),
        workoutStats: computeSportTimeStats(sportActivities, 'street_workout'),
        bikeStats: computeSportTimeStats(sportActivities, 'bike'),
        dailyActivityMap: computeSportDailyMap(sportActivities),
      };

      const weeklyAverages = computeWeeklyAverages(mealEntries, foods);

      set({
        isLoading: false,
        isReady: true,
        japaneseActivities,
        sportActivities,
        mealEntries,
        foods,
        weightEntries,
        books,
        japaneseStats,
        sportStats,
        weeklyAverages,
      });
    } catch (error) {
      console.error('Failed to preload data:', error);
      set({ isLoading: false });
    }
  },

  // Recompute stats
  recomputeJapaneseStats: () => {
    const { japaneseActivities } = get();
    set({
      japaneseStats: {
        streaks: computeStreaks(japaneseActivities),
        flashcardStats: computeFlashcardStats(japaneseActivities),
        timeStats: computePeriodStats(japaneseActivities),
        dailyTimeMap: computeDailyTimeMap(japaneseActivities),
      },
    });
  },

  recomputeSportStats: () => {
    const { sportActivities } = get();
    set({
      sportStats: {
        runningStats: computeSportTimeStats(sportActivities, 'running'),
        workoutStats: computeSportTimeStats(sportActivities, 'street_workout'),
        bikeStats: computeSportTimeStats(sportActivities, 'bike'),
        dailyActivityMap: computeSportDailyMap(sportActivities),
      },
    });
  },

  recomputeNutritionStats: () => {
    const { mealEntries, foods } = get();
    set({ weeklyAverages: computeWeeklyAverages(mealEntries, foods) });
  },

  // Optimistic updates for Japanese activities
  addJapaneseActivity: (activity) => {
    set((state) => ({
      japaneseActivities: [...state.japaneseActivities, activity],
    }));
    get().recomputeJapaneseStats();
  },

  updateJapaneseActivity: (activity) => {
    set((state) => ({
      japaneseActivities: state.japaneseActivities.map((a) =>
        a.id === activity.id ? activity : a
      ),
    }));
    get().recomputeJapaneseStats();
  },

  deleteJapaneseActivity: (id) => {
    set((state) => ({
      japaneseActivities: state.japaneseActivities.filter((a) => a.id !== id),
    }));
    get().recomputeJapaneseStats();
  },

  // Optimistic updates for Sport activities
  addSportActivity: (activity) => {
    set((state) => ({
      sportActivities: [...state.sportActivities, activity],
    }));
    get().recomputeSportStats();
  },

  updateSportActivity: (activity) => {
    set((state) => ({
      sportActivities: state.sportActivities.map((a) =>
        a.id === activity.id ? activity : a
      ),
    }));
    get().recomputeSportStats();
  },

  deleteSportActivity: (id) => {
    set((state) => ({
      sportActivities: state.sportActivities.filter((a) => a.id !== id),
    }));
    get().recomputeSportStats();
  },

  // Optimistic updates for Meal entries
  addMealEntry: (entry) => {
    set((state) => ({
      mealEntries: [...state.mealEntries, entry],
    }));
    get().recomputeNutritionStats();
  },

  updateMealEntry: (entry) => {
    set((state) => ({
      mealEntries: state.mealEntries.map((m) =>
        m.id === entry.id ? entry : m
      ),
    }));
    get().recomputeNutritionStats();
  },

  deleteMealEntry: (id) => {
    set((state) => ({
      mealEntries: state.mealEntries.filter((m) => m.id !== id),
    }));
    get().recomputeNutritionStats();
  },

  // Optimistic updates for Foods
  addFood: (food) => {
    set((state) => ({
      foods: [...state.foods, food],
    }));
  },

  updateFood: (food) => {
    set((state) => ({
      foods: state.foods.map((f) => (f.id === food.id ? food : f)),
    }));
    get().recomputeNutritionStats();
  },

  // Optimistic updates for Weight entries
  addWeightEntry: (entry) => {
    set((state) => ({
      weightEntries: [...state.weightEntries, entry],
    }));
  },

  updateWeightEntry: (entry) => {
    set((state) => ({
      weightEntries: state.weightEntries.map((e) =>
        e.id === entry.id ? entry : e
      ),
    }));
  },

  deleteWeightEntry: (id) => {
    set((state) => ({
      weightEntries: state.weightEntries.filter((e) => e.id !== id),
    }));
  },

  // Optimistic updates for Books
  addBook: (book) => {
    set((state) => ({
      books: [...state.books, book],
    }));
  },

  updateBook: (book) => {
    set((state) => ({
      books: state.books.map((b) => (b.id === book.id ? book : b)),
    }));
  },

  deleteBook: (id) => {
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
    }));
  },
}));
