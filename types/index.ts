// Enums
export const JapaneseActivityType = {
  FLASHCARDS: 'flashcards',
  READING: 'reading',
  WATCHING: 'watching',
  LISTENING: 'listening',
} as const;
export type JapaneseActivityType = (typeof JapaneseActivityType)[keyof typeof JapaneseActivityType];

export const MealType = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

export const SportType = {
  RUNNING: 'running',
  STREET_WORKOUT: 'street_workout',
  BIKE: 'bike',
} as const;
export type SportType = (typeof SportType)[keyof typeof SportType];

export const TrainingType = {
  BASE: 'base',
  INTERVALS: 'intervals',
  LONG_RUN: 'long_run',
} as const;
export type TrainingType = (typeof TrainingType)[keyof typeof TrainingType];

// Base interface for synced entities
export interface SyncableEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  pendingSync: boolean;
  deletedAt?: Date; // Soft delete for sync
}

// Data Models
export interface Book extends SyncableEntity {
  title: string;
  completed: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
  totalReadingTimeMinutes: number;
}

export interface JapaneseActivity extends SyncableEntity {
  type: JapaneseActivityType;
  durationMinutes: number;
  newCards: number | null; // Only for flashcards
  bookId: string | null; // Only for reading
  date: string; // ISO date string YYYY-MM-DD
}

export interface Food extends SyncableEntity {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface MealEntry extends SyncableEntity {
  foodId: string;
  mealType: MealType;
  quantityGrams: number;
  date: string; // ISO date string YYYY-MM-DD
}

export interface SportActivity extends SyncableEntity {
  sportType: SportType;
  durationMinutes: number;
  distanceKm: number | null; // Only for running and bike
  trainingType: TrainingType | null; // Only for running
  date: string; // ISO date string YYYY-MM-DD
}

export interface WeightEntry extends SyncableEntity {
  weightKg: number;
  date: string; // ISO date string YYYY-MM-DD (unique per day)
}

// Sync metadata
export interface SyncMeta {
  key: string;
  value: string | number | Date;
}

// API Keys
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// Form input types (without sync fields)
export type BookInput = Omit<Book, keyof SyncableEntity>;
export type JapaneseActivityInput = Omit<JapaneseActivity, keyof SyncableEntity>;
export type FoodInput = Omit<Food, keyof SyncableEntity>;
export type MealEntryInput = Omit<MealEntry, keyof SyncableEntity>;
export type SportActivityInput = Omit<SportActivity, keyof SyncableEntity>;
export type WeightEntryInput = Omit<WeightEntry, keyof SyncableEntity>;

// Stats types
export interface StreakInfo {
  current: number;
  longest: number;
}

export interface PeriodStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Date helper
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function today(): string {
  return toDateString(new Date());
}
