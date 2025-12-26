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
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
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
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
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

function computeTodayMinutes(activities: JapaneseActivity[]): number {
  const todayStr = today();
  return activities
    .filter((a) => a.date === todayStr)
    .reduce((sum, a) => sum + a.durationMinutes, 0);
}

function computeWeeklyAverageStudy(activities: JapaneseActivity[]): number {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Get daily totals for last 7 days
  const dailyTotals = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + i);
    dailyTotals.set(toDateString(date), 0);
  }

  for (const activity of activities) {
    const activityDate = new Date(activity.date);
    if (activityDate >= sevenDaysAgo && activityDate <= now) {
      const current = dailyTotals.get(activity.date) ?? 0;
      dailyTotals.set(activity.date, current + activity.durationMinutes);
    }
  }

  const total = Array.from(dailyTotals.values()).reduce((sum, v) => sum + v, 0);
  return Math.round(total / 7);
}

function computeTimeByType(activities: JapaneseActivity[]): {
  flashcards: PeriodStats;
  reading: PeriodStats;
  watching: PeriodStats;
  listening: PeriodStats;
} {
  const types = ['flashcards', 'reading', 'watching', 'listening'] as const;
  const result: Record<string, PeriodStats> = {};

  for (const type of types) {
    const filtered = activities.filter((a) => a.type === type);
    result[type] = computePeriodStats(filtered);
  }

  return result as {
    flashcards: PeriodStats;
    reading: PeriodStats;
    watching: PeriodStats;
    listening: PeriodStats;
  };
}

function computeTimeByDayOfWeek(activities: JapaneseActivity[]): number[] {
  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  // Get unique dates with activities
  const dateMinutes = new Map<string, number>();
  for (const activity of activities) {
    const current = dateMinutes.get(activity.date) ?? 0;
    dateMinutes.set(activity.date, current + activity.durationMinutes);
  }

  for (const [dateStr, minutes] of dateMinutes) {
    const date = new Date(dateStr);
    // getDay() returns 0 for Sunday, we want Monday = 0
    const dayIndex = (date.getDay() + 6) % 7;
    dayTotals[dayIndex] += minutes;
    dayCounts[dayIndex]++;
  }

  // Calculate averages
  return dayTotals.map((total, i) => 
    dayCounts[i] > 0 ? Math.round(total / dayCounts[i]) : 0
  );
}

function computeCardsPerSession(activities: JapaneseActivity[]): number {
  const flashcardActivities = activities.filter(
    (a) => a.type === 'flashcards' && a.newCards !== null && a.newCards > 0
  );
  if (flashcardActivities.length === 0) return 0;

  const totalCards = flashcardActivities.reduce((sum, a) => sum + (a.newCards ?? 0), 0);
  return Math.round(totalCards / flashcardActivities.length);
}

function computeBestDay(activities: JapaneseActivity[]): { date: string; minutes: number } {
  const dailyTotals = new Map<string, number>();
  for (const activity of activities) {
    const current = dailyTotals.get(activity.date) ?? 0;
    dailyTotals.set(activity.date, current + activity.durationMinutes);
  }

  let bestDate = '';
  let bestMinutes = 0;
  for (const [date, minutes] of dailyTotals) {
    if (minutes > bestMinutes) {
      bestMinutes = minutes;
      bestDate = date;
    }
  }

  return { date: bestDate, minutes: bestMinutes };
}

function computeBestMonth(activities: JapaneseActivity[]): { date: string; minutes: number } {
  const monthlyTotals = new Map<string, number>();
  for (const activity of activities) {
    const month = activity.date.substring(0, 7); // "2025-01"
    const current = monthlyTotals.get(month) ?? 0;
    monthlyTotals.set(month, current + activity.durationMinutes);
  }

  let bestMonth = '';
  let bestMinutes = 0;
  for (const [month, minutes] of monthlyTotals) {
    if (minutes > bestMinutes) {
      bestMinutes = minutes;
      bestMonth = month;
    }
  }

  return { date: bestMonth, minutes: bestMinutes };
}

function computeWeeklyComparison(activities: JapaneseActivity[]): {
  thisWeek: number;
  lastWeek: number;
  change: number;
} {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  // Calculate how many days have passed this week (1 = Monday only, 7 = full week)
  const dayOfWeek = now.getDay();
  const daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday = 7, Mon = 1, etc.

  // End of comparison period for last week (same day of week as today)
  const endOfLastWeekComparison = new Date(startOfLastWeek);
  endOfLastWeekComparison.setDate(startOfLastWeek.getDate() + daysIntoWeek);
  endOfLastWeekComparison.setHours(0, 0, 0, 0);

  let thisWeek = 0;
  let lastWeek = 0;

  for (const activity of activities) {
    const activityDate = new Date(activity.date);
    if (activityDate >= startOfThisWeek && activityDate <= now) {
      thisWeek += activity.durationMinutes;
    } else if (activityDate >= startOfLastWeek && activityDate < endOfLastWeekComparison) {
      lastWeek += activity.durationMinutes;
    }
  }

  const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

  return { thisWeek, lastWeek, change };
}

function computeMonthlyTrend(activities: JapaneseActivity[]): Array<{
  month: string;
  label: string;
  minutes: number;
}> {
  const now = new Date();
  const result: Array<{ month: string; label: string; minutes: number }> = [];

  // Last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    result.push({ month: monthKey, label, minutes: 0 });
  }

  // Aggregate activities
  for (const activity of activities) {
    const monthKey = activity.date.substring(0, 7);
    const entry = result.find((r) => r.month === monthKey);
    if (entry) {
      entry.minutes += activity.durationMinutes;
    }
  }

  return result;
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

function computeAppStreak(
  japaneseActivities: JapaneseActivity[],
  mealEntries: MealEntry[],
  sportActivities: SportActivity[],
  weightEntries: WeightEntry[]
): number {
  // Collect all unique dates with any activity
  const activeDates = new Set<string>();

  japaneseActivities.forEach((a) => activeDates.add(a.date));
  mealEntries.forEach((m) => activeDates.add(m.date));
  sportActivities.forEach((s) => activeDates.add(s.date));
  weightEntries.forEach((w) => activeDates.add(w.date));

  if (activeDates.size === 0) {
    return 0;
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

  return currentStreak;
}

function computeWeeklyAverages(mealEntries: MealEntry[], foods: Food[]): MacroTotals {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
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

// Extended stats types
interface TimeByType {
  flashcards: PeriodStats;
  reading: PeriodStats;
  watching: PeriodStats;
  listening: PeriodStats;
}

interface BestRecord {
  date: string;
  minutes: number;
}

interface WeeklyComparison {
  thisWeek: number;
  lastWeek: number;
  change: number; // percentage change
}

interface MonthlyDataPoint {
  month: string; // "2025-01"
  label: string; // "Jan 2025"
  minutes: number;
}

// Store types
interface JapaneseStats {
  streaks: StreakInfo;
  flashcardStats: PeriodStats;
  timeStats: PeriodStats;
  dailyTimeMap: Map<string, number>;
  // New stats
  todayMinutes: number;
  weeklyAverage: number; // average daily minutes over last 7 days
  timeByType: TimeByType;
  timeByDayOfWeek: number[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun] averages
  cardsPerSession: number;
  bestDay: BestRecord;
  bestMonth: BestRecord;
  weeklyComparison: WeeklyComparison;
  monthlyTrend: MonthlyDataPoint[]; // last 12 months
}

interface SportStats {
  runningStats: PeriodStats;
  workoutStats: PeriodStats;
  bikeStats: PeriodStats;
  dailyActivityMap: Map<string, { running: boolean; workout: boolean }>;
}

interface AppSettings {
  japaneseDailyGoalMinutes: number;
}

interface AppStore {
  // Loading state
  isLoading: boolean;
  isReady: boolean;

  // App update state
  updateAvailable: boolean;
  setUpdateAvailable: (available: boolean) => void;

  // Settings
  settings: AppSettings;
  setJapaneseDailyGoal: (minutes: number) => Promise<void>;

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
  appStreak: number;

  // Actions
  preloadAll: () => Promise<void>;
  recomputeJapaneseStats: () => void;
  recomputeSportStats: () => void;
  recomputeNutritionStats: () => void;
  recomputeAppStreak: () => void;

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

const defaultPeriodStats: PeriodStats = { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 };

const defaultJapaneseStats: JapaneseStats = {
  streaks: { current: 0, longest: 0 },
  flashcardStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  timeStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  dailyTimeMap: new Map(),
  todayMinutes: 0,
  weeklyAverage: 0,
  timeByType: {
    flashcards: defaultPeriodStats,
    reading: defaultPeriodStats,
    watching: defaultPeriodStats,
    listening: defaultPeriodStats,
  },
  timeByDayOfWeek: [0, 0, 0, 0, 0, 0, 0],
  cardsPerSession: 0,
  bestDay: { date: '', minutes: 0 },
  bestMonth: { date: '', minutes: 0 },
  weeklyComparison: { thisWeek: 0, lastWeek: 0, change: 0 },
  monthlyTrend: [],
};

const defaultSportStats: SportStats = {
  runningStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  workoutStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  bikeStats: { total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 },
  dailyActivityMap: new Map(),
};

const defaultWeeklyAverages: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const defaultSettings: AppSettings = {
  japaneseDailyGoalMinutes: 60,
};

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  isLoading: false,
  isReady: false,

  // App update state
  updateAvailable: false,
  setUpdateAvailable: (available) => set({ updateAvailable: available }),

  // Settings
  settings: defaultSettings,
  setJapaneseDailyGoal: async (minutes: number) => {
    set({ settings: { ...get().settings, japaneseDailyGoalMinutes: minutes } });
    await db.syncMeta.put({ key: 'japaneseDailyGoalMinutes', value: minutes });
  },

  japaneseActivities: [],
  sportActivities: [],
  mealEntries: [],
  foods: [],
  weightEntries: [],
  books: [],

  japaneseStats: defaultJapaneseStats,
  sportStats: defaultSportStats,
  weeklyAverages: defaultWeeklyAverages,
  appStreak: 0,

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
        japaneseDailyGoalMeta,
      ] = await Promise.all([
        db.japaneseActivities.filter((a) => !a.deletedAt).toArray(),
        db.sportActivities.filter((a) => !a.deletedAt).toArray(),
        db.mealEntries.filter((m) => !m.deletedAt).toArray(),
        db.foods.filter((f) => !f.deletedAt).toArray(),
        db.weightEntries.filter((e) => !e.deletedAt).toArray(),
        db.books.filter((b) => !b.deletedAt).toArray(),
        db.syncMeta.get('japaneseDailyGoalMinutes'),
      ]);

      // Load settings
      const settings: AppSettings = {
        japaneseDailyGoalMinutes: typeof japaneseDailyGoalMeta?.value === 'number' 
          ? japaneseDailyGoalMeta.value 
          : 60,
      };

      // Compute stats
      const japaneseStats: JapaneseStats = {
        streaks: computeStreaks(japaneseActivities),
        flashcardStats: computeFlashcardStats(japaneseActivities),
        timeStats: computePeriodStats(japaneseActivities),
        dailyTimeMap: computeDailyTimeMap(japaneseActivities),
        todayMinutes: computeTodayMinutes(japaneseActivities),
        weeklyAverage: computeWeeklyAverageStudy(japaneseActivities),
        timeByType: computeTimeByType(japaneseActivities),
        timeByDayOfWeek: computeTimeByDayOfWeek(japaneseActivities),
        cardsPerSession: computeCardsPerSession(japaneseActivities),
        bestDay: computeBestDay(japaneseActivities),
        bestMonth: computeBestMonth(japaneseActivities),
        weeklyComparison: computeWeeklyComparison(japaneseActivities),
        monthlyTrend: computeMonthlyTrend(japaneseActivities),
      };

      const sportStats: SportStats = {
        runningStats: computeSportTimeStats(sportActivities, 'running'),
        workoutStats: computeSportTimeStats(sportActivities, 'street_workout'),
        bikeStats: computeSportTimeStats(sportActivities, 'bike'),
        dailyActivityMap: computeSportDailyMap(sportActivities),
      };

      const weeklyAverages = computeWeeklyAverages(mealEntries, foods);
      const appStreak = computeAppStreak(japaneseActivities, mealEntries, sportActivities, weightEntries);

      set({
        isLoading: false,
        isReady: true,
        settings,
        japaneseActivities,
        sportActivities,
        mealEntries,
        foods,
        weightEntries,
        books,
        japaneseStats,
        sportStats,
        weeklyAverages,
        appStreak,
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
        todayMinutes: computeTodayMinutes(japaneseActivities),
        weeklyAverage: computeWeeklyAverageStudy(japaneseActivities),
        timeByType: computeTimeByType(japaneseActivities),
        timeByDayOfWeek: computeTimeByDayOfWeek(japaneseActivities),
        cardsPerSession: computeCardsPerSession(japaneseActivities),
        bestDay: computeBestDay(japaneseActivities),
        bestMonth: computeBestMonth(japaneseActivities),
        weeklyComparison: computeWeeklyComparison(japaneseActivities),
        monthlyTrend: computeMonthlyTrend(japaneseActivities),
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

  recomputeAppStreak: () => {
    const { japaneseActivities, mealEntries, sportActivities, weightEntries } = get();
    set({ appStreak: computeAppStreak(japaneseActivities, mealEntries, sportActivities, weightEntries) });
  },

  // Optimistic updates for Japanese activities
  addJapaneseActivity: (activity) => {
    set((state) => ({
      japaneseActivities: [...state.japaneseActivities, activity],
    }));
    get().recomputeJapaneseStats();
    get().recomputeAppStreak();
  },

  updateJapaneseActivity: (activity) => {
    set((state) => ({
      japaneseActivities: state.japaneseActivities.map((a) =>
        a.id === activity.id ? activity : a
      ),
    }));
    get().recomputeJapaneseStats();
    get().recomputeAppStreak();
  },

  deleteJapaneseActivity: (id) => {
    set((state) => ({
      japaneseActivities: state.japaneseActivities.filter((a) => a.id !== id),
    }));
    get().recomputeJapaneseStats();
    get().recomputeAppStreak();
  },

  // Optimistic updates for Sport activities
  addSportActivity: (activity) => {
    set((state) => ({
      sportActivities: [...state.sportActivities, activity],
    }));
    get().recomputeSportStats();
    get().recomputeAppStreak();
  },

  updateSportActivity: (activity) => {
    set((state) => ({
      sportActivities: state.sportActivities.map((a) =>
        a.id === activity.id ? activity : a
      ),
    }));
    get().recomputeSportStats();
    get().recomputeAppStreak();
  },

  deleteSportActivity: (id) => {
    set((state) => ({
      sportActivities: state.sportActivities.filter((a) => a.id !== id),
    }));
    get().recomputeSportStats();
    get().recomputeAppStreak();
  },

  // Optimistic updates for Meal entries
  addMealEntry: (entry) => {
    set((state) => ({
      mealEntries: [...state.mealEntries, entry],
    }));
    get().recomputeNutritionStats();
    get().recomputeAppStreak();
  },

  updateMealEntry: (entry) => {
    set((state) => ({
      mealEntries: state.mealEntries.map((m) =>
        m.id === entry.id ? entry : m
      ),
    }));
    get().recomputeNutritionStats();
    get().recomputeAppStreak();
  },

  deleteMealEntry: (id) => {
    set((state) => ({
      mealEntries: state.mealEntries.filter((m) => m.id !== id),
    }));
    get().recomputeNutritionStats();
    get().recomputeAppStreak();
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
    get().recomputeAppStreak();
  },

  updateWeightEntry: (entry) => {
    set((state) => ({
      weightEntries: state.weightEntries.map((e) =>
        e.id === entry.id ? entry : e
      ),
    }));
    get().recomputeAppStreak();
  },

  deleteWeightEntry: (id) => {
    set((state) => ({
      weightEntries: state.weightEntries.filter((e) => e.id !== id),
    }));
    get().recomputeAppStreak();
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
