'use client';

import { useState, useEffect } from 'react';
import { Coffee, Sun, Moon, Cookie, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNutrition } from '@/hooks/useNutrition';
import { MealType, today } from '@/types';
import { parseDecimal } from '@/lib/utils';
import type { Food } from '@/types';

interface MealInputProps {
  onSuccess?: () => void;
}

type Step = 'meal-type' | 'food-select' | 'new-food' | 'quantity';

const mealTypes = [
  { type: MealType.BREAKFAST, label: 'Breakfast', icon: Coffee },
  { type: MealType.LUNCH, label: 'Lunch', icon: Sun },
  { type: MealType.DINNER, label: 'Dinner', icon: Moon },
  { type: MealType.SNACK, label: 'Snack', icon: Cookie },
];

export function MealInput({ onSuccess }: MealInputProps) {
  const { addFood, addMealEntry, searchFoods, getRecentFoods, getLastQuantitiesForFoods } = useNutrition();

  const [step, setStep] = useState<Step>('meal-type');
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [lastQuantities, setLastQuantities] = useState<Map<string, number>>(new Map());
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  // New food form state
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCalories, setNewFoodCalories] = useState('');
  const [newFoodProtein, setNewFoodProtein] = useState('');
  const [newFoodCarbs, setNewFoodCarbs] = useState('');
  const [newFoodFat, setNewFoodFat] = useState('');

  // Load recent foods when entering food selection
  useEffect(() => {
    if (step === 'food-select') {
      getRecentFoods(10).then(setRecentFoods);
      searchFoods('').then(setSearchResults);
    }
  }, [step, getRecentFoods, searchFoods]);

  // Load last quantities for displayed foods
  useEffect(() => {
    if (step === 'food-select') {
      const allFoodIds = [...new Set([...recentFoods.map(f => f.id), ...searchResults.map(f => f.id)])];
      if (allFoodIds.length > 0) {
        getLastQuantitiesForFoods(allFoodIds).then(setLastQuantities);
      }
    }
  }, [step, recentFoods, searchResults, getLastQuantitiesForFoods]);

  // Search foods when query changes
  useEffect(() => {
    if (step === 'food-select') {
      searchFoods(searchQuery).then(setSearchResults);
    }
  }, [searchQuery, step, searchFoods]);

  const handleMealTypeSelect = (type: MealType) => {
    setSelectedMealType(type);
    setStep('food-select');
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setStep('quantity');
  };

  const handleNewFood = () => {
    setNewFoodName(searchQuery);
    setStep('new-food');
  };

  const handleSaveNewFood = async () => {
    const calories = parseDecimal(newFoodCalories);
    const protein = parseDecimal(newFoodProtein);
    const carbs = parseDecimal(newFoodCarbs);
    const fat = parseDecimal(newFoodFat);

    if (!newFoodName.trim()) {
      toast.error('Please enter a food name');
      return;
    }

    if (isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat)) {
      toast.error('Please fill in all nutrition values');
      return;
    }

    setLoading(true);
    try {
      const food = await addFood({
        name: newFoodName.trim(),
        caloriesPer100g: calories,
        proteinPer100g: protein,
        carbsPer100g: carbs,
        fatPer100g: fat,
      });

      setSelectedFood(food);
      setStep('quantity');
      toast.success('Food added!');
    } catch (error) {
      console.error('Failed to add food:', error);
      toast.error('Failed to add food');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMealType || !selectedFood) return;

    const grams = parseDecimal(quantity);
    if (isNaN(grams) || grams <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      await addMealEntry({
        foodId: selectedFood.id,
        mealType: selectedMealType,
        quantityGrams: grams,
        date: today(),
      });

      toast.success('Meal logged!');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to log meal:', error);
      toast.error('Failed to log meal');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'food-select':
        setStep('meal-type');
        setSelectedMealType(null);
        break;
      case 'new-food':
        setStep('food-select');
        break;
      case 'quantity':
        setStep('food-select');
        setSelectedFood(null);
        break;
    }
  };

  // Step 1: Meal Type Selection
  if (step === 'meal-type') {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Select meal type:</p>
        <div className="grid grid-cols-2 gap-3">
          {mealTypes.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              className="h-24 flex flex-col gap-2"
              pressMode="press"
              onClick={() => handleMealTypeSelect(type)}
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Food Selection
  if (step === 'food-select') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onPointerDown={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>&larr;</span>
          <span>{mealTypes.find((m) => m.type === selectedMealType)?.label}</span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[50vh]">
          {/* Recent foods */}
          {!searchQuery && recentFoods.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Recent</p>
              <div className="space-y-1">
                {recentFoods.map((food) => {
                  const lastQty = lastQuantities.get(food.id);
                  return (
                    <button
                      key={food.id}
                      onPointerDown={() => handleFoodSelect(food)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {food.caloriesPer100g} kcal/100g
                        {lastQty !== undefined && ` · last: ${lastQty}g`}
                      </p>
                    </button>
                  );
                })}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {/* Search results / All foods */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {searchQuery ? 'Results' : 'All Foods'}
            </p>
            <div className="space-y-1">
              {searchResults.map((food) => {
                const lastQty = lastQuantities.get(food.id);
                return (
                  <button
                    key={food.id}
                    onPointerDown={() => handleFoodSelect(food)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{food.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {food.caloriesPer100g} kcal/100g
                      {lastQty !== undefined && ` · last: ${lastQty}g`}
                    </p>
                  </button>
                );
              })}

              {searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  No foods found
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Add new food button */}
        <Button
          variant="outline"
          className="w-full"
          pressMode="press"
          onClick={handleNewFood}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Food
        </Button>
      </div>
    );
  }

  // Step 3: New Food Form
  if (step === 'new-food') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onPointerDown={handleBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>&larr;</span>
          <span>Back to search</span>
        </button>

        <p className="font-medium">Add New Food</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="foodName">Name</Label>
            <Input
              id="foodName"
              value={newFoodName}
              onChange={(e) => setNewFoodName(e.target.value)}
              placeholder="e.g., Chicken breast"
              autoFocus
            />
          </div>

          <p className="text-sm text-muted-foreground">Nutrition per 100g:</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="text"
                inputMode="decimal"
                value={newFoodCalories}
                onChange={(e) => setNewFoodCalories(e.target.value)}
                placeholder="kcal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="text"
                inputMode="decimal"
                value={newFoodProtein}
                onChange={(e) => setNewFoodProtein(e.target.value)}
                placeholder="g"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="text"
                inputMode="decimal"
                value={newFoodCarbs}
                onChange={(e) => setNewFoodCarbs(e.target.value)}
                placeholder="g"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="text"
                inputMode="decimal"
                value={newFoodFat}
                onChange={(e) => setNewFoodFat(e.target.value)}
                placeholder="g"
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSaveNewFood}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Quantity Input
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <button
        type="button"
        onPointerDown={handleBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>&larr;</span>
        <span>{selectedFood?.name}</span>
      </button>

      {/* Food summary */}
      {selectedFood && (
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="font-medium">{selectedFood.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Per 100g: {selectedFood.caloriesPer100g} kcal |{' '}
            P: {selectedFood.proteinPer100g}g |{' '}
            C: {selectedFood.carbsPer100g}g |{' '}
            F: {selectedFood.fatPer100g}g
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity (grams)</Label>
        <Input
          id="quantity"
          type="text"
          inputMode="decimal"
          placeholder="e.g., 150"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          autoFocus
        />
        {quantity && selectedFood && (
          <p className="text-sm text-muted-foreground">
            = {Math.round((selectedFood.caloriesPer100g * parseDecimal(quantity)) / 100)} kcal
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : 'Log Meal'}
      </Button>
    </form>
  );
}
