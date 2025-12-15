'use client';

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSyncableEntity, markForSync } from '@/lib/db';
import { useSync } from './useSync';
import { useAppStore } from '@/lib/store';
import type {
  Food,
  FoodInput,
  MealEntry,
  MealEntryInput,
  MacroTotals,
} from '@/types';

export function useNutrition() {
  const { triggerSync } = useSync();

  // Get all foods (non-deleted)
  const foods = useLiveQuery(
    () =>
      db.foods
        .filter((f) => !f.deletedAt)
        .sortBy('name'),
    []
  );

  // Get all meal entries (non-deleted)
  const mealEntries = useLiveQuery(
    () =>
      db.mealEntries
        .filter((m) => !m.deletedAt)
        .reverse()
        .sortBy('date'),
    []
  );

  // Add a new food
  const addFood = async (input: FoodInput): Promise<Food> => {
    const food: Food = {
      ...createSyncableEntity(),
      ...input,
    };

    // Optimistic update
    useAppStore.getState().addFood(food);

    await db.foods.add(food);
    triggerSync();
    return food;
  };

  // Update an existing food
  const updateFood = async (
    id: string,
    updates: Partial<FoodInput>
  ): Promise<void> => {
    const existing = await db.foods.get(id);
    if (!existing) return;

    const updated = markForSync({ ...existing, ...updates });
    // Optimistic update
    useAppStore.getState().updateFood(updated);
    await db.foods.put(updated);
    triggerSync();
  };

  // Soft delete a food
  const deleteFood = async (id: string): Promise<void> => {
    const existing = await db.foods.get(id);
    if (!existing) return;

    const deleted = markForSync({ ...existing, deletedAt: new Date() });
    await db.foods.put(deleted);
    triggerSync();
  };

  // Add a new meal entry
  const addMealEntry = async (input: MealEntryInput): Promise<void> => {
    const entry: MealEntry = {
      ...createSyncableEntity(),
      ...input,
    };

    // Optimistic update
    useAppStore.getState().addMealEntry(entry);

    await db.mealEntries.add(entry);
    triggerSync();
  };

  // Update an existing meal entry
  const updateMealEntry = async (
    id: string,
    updates: Partial<MealEntryInput>
  ): Promise<void> => {
    const existing = await db.mealEntries.get(id);
    if (!existing) return;

    const updated = markForSync({ ...existing, ...updates });
    // Optimistic update
    useAppStore.getState().updateMealEntry(updated);
    await db.mealEntries.put(updated);
    triggerSync();
  };

  // Soft delete a meal entry
  const deleteMealEntry = async (id: string): Promise<void> => {
    const existing = await db.mealEntries.get(id);
    if (!existing) return;

    // Optimistic update (remove from store immediately)
    useAppStore.getState().deleteMealEntry(id);

    const deleted = markForSync({ ...existing, deletedAt: new Date() });
    await db.mealEntries.put(deleted);
    triggerSync();
  };

  // Search foods by name
  const searchFoods = useCallback(async (query: string): Promise<Food[]> => {
    if (!query.trim()) {
      return db.foods.filter((f) => !f.deletedAt).toArray();
    }

    const lowerQuery = query.toLowerCase();
    return db.foods
      .filter((f) => !f.deletedAt && f.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }, []);

  // Get recent foods (last N unique foods used in meals)
  const getRecentFoods = useCallback(async (limit: number = 10): Promise<Food[]> => {
    const recentEntries = await db.mealEntries
      .filter((m) => !m.deletedAt)
      .reverse()
      .sortBy('createdAt');

    const seenFoodIds = new Set<string>();
    const recentFoodIds: string[] = [];

    for (const entry of recentEntries) {
      if (!seenFoodIds.has(entry.foodId)) {
        seenFoodIds.add(entry.foodId);
        recentFoodIds.push(entry.foodId);
        if (recentFoodIds.length >= limit) break;
      }
    }

    const recentFoods = await Promise.all(
      recentFoodIds.map((id) => db.foods.get(id))
    );

    return recentFoods.filter((f): f is Food => f !== undefined && !f.deletedAt);
  }, []);

  // Get food by ID
  const getFoodById = async (id: string): Promise<Food | undefined> => {
    return db.foods.get(id);
  };

  // Get last quantity used for a specific food
  const getLastQuantityForFood = useCallback(async (foodId: string): Promise<number | null> => {
    const entries = await db.mealEntries
      .filter((m) => !m.deletedAt && m.foodId === foodId)
      .reverse()
      .sortBy('createdAt');

    return entries.length > 0 ? entries[0].quantityGrams : null;
  }, []);

  // Get last quantities for multiple foods (batch operation)
  const getLastQuantitiesForFoods = useCallback(async (foodIds: string[]): Promise<Map<string, number>> => {
    const result = new Map<string, number>();

    const entries = await db.mealEntries
      .filter((m) => !m.deletedAt && foodIds.includes(m.foodId))
      .reverse()
      .sortBy('createdAt');

    // Get the most recent entry for each food
    for (const entry of entries) {
      if (!result.has(entry.foodId)) {
        result.set(entry.foodId, entry.quantityGrams);
      }
    }

    return result;
  }, []);

  return {
    foods,
    mealEntries,
    addFood,
    updateFood,
    deleteFood,
    addMealEntry,
    updateMealEntry,
    deleteMealEntry,
    searchFoods,
    getRecentFoods,
    getFoodById,
    getLastQuantityForFood,
    getLastQuantitiesForFoods,
  };
}

// Separate hook for nutrition stats
export function useNutritionStats() {
  const foods = useLiveQuery(
    () => db.foods.filter((f) => !f.deletedAt).toArray(),
    []
  );

  const mealEntries = useLiveQuery(
    () => db.mealEntries.filter((m) => !m.deletedAt).toArray(),
    []
  );

  // Calculate macros for a specific date
  const getDailyMacros = async (date: string): Promise<MacroTotals> => {
    const entries = await db.mealEntries
      .where('date')
      .equals(date)
      .filter((m) => !m.deletedAt)
      .toArray();

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const entry of entries) {
      const food = await db.foods.get(entry.foodId);
      if (!food) continue;

      const multiplier = entry.quantityGrams / 100;
      calories += food.caloriesPer100g * multiplier;
      protein += food.proteinPer100g * multiplier;
      carbs += food.carbsPer100g * multiplier;
      fat += food.fatPer100g * multiplier;
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  };

  // Get meals for a specific date with food details
  const getMealsForDate = async (date: string) => {
    const entries = await db.mealEntries
      .where('date')
      .equals(date)
      .filter((m) => !m.deletedAt)
      .toArray();

    const mealsWithFood = await Promise.all(
      entries.map(async (entry) => {
        const food = await db.foods.get(entry.foodId);
        return { entry, food };
      })
    );

    return mealsWithFood.filter((m) => m.food !== undefined);
  };

  // Calculate weekly averages
  const getWeeklyAverages = async (): Promise<MacroTotals> => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const entries = await db.mealEntries
      .filter((m) => !m.deletedAt && new Date(m.date) >= startOfWeek)
      .toArray();

    // Group by date
    const dailyTotals = new Map<string, MacroTotals>();

    for (const entry of entries) {
      const food = await db.foods.get(entry.foodId);
      if (!food) continue;

      const multiplier = entry.quantityGrams / 100;
      const current = dailyTotals.get(entry.date) ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

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
  };

  return {
    foods,
    mealEntries,
    getDailyMacros,
    getMealsForDate,
    getWeeklyAverages,
  };
}
