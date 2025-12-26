'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart } from '@/components/charts/line-chart';
import { useAppStore } from '@/lib/store';

type Period = '1m' | '3m' | '1y';

export function Nutrition() {
  const mealEntries = useAppStore((s) => s.mealEntries);
  const foods = useAppStore((s) => s.foods);
  const weightEntries = useAppStore((s) => s.weightEntries);
  const weeklyAverages = useAppStore((s) => s.weeklyAverages);
  const weightGoalKg = useAppStore((s) => s.settings.weightGoalKg);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [period, setPeriod] = useState<Period>('3m');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  // Get meals for selected date
  const meals = useMemo(() => {
    const entries = mealEntries.filter((m) => m.date === dateStr);
    return entries.map((entry) => ({
      entry,
      food: foodMap.get(entry.foodId),
    })).filter((m) => m.food !== undefined);
  }, [mealEntries, dateStr, foodMap]);

  // Calculate daily macros
  const dailyMacros = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const { entry, food } of meals) {
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
  }, [meals]);

  // Get weight history based on period
  const weightData = useMemo(() => {
    const monthsBack = period === '1m' ? 1 : period === '3m' ? 3 : 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return weightEntries
      .filter((e) => e.date > cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date, weight: e.weightKg }));
  }, [weightEntries, period]);

  // Calculate Y-axis domain for weight chart based on goal
  // Range: goal - 3kg to goal + 15kg
  const weightDomain = useMemo((): [number, number] => {
    return [Math.floor(weightGoalKg - 3), Math.ceil(weightGoalKg + 15)];
  }, [weightGoalKg]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Nutrition Stats</h2>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateDate('next')}
          disabled={dateStr >= format(new Date(), 'yyyy-MM-dd')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Daily Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold">{dailyMacros.calories}</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dailyMacros.protein}</p>
              <p className="text-xs text-muted-foreground">protein</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dailyMacros.carbs}</p>
              <p className="text-xs text-muted-foreground">carbs</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{dailyMacros.fat}</p>
              <p className="text-xs text-muted-foreground">fat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meals List */}
      {meals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meals.map(({ entry, food }, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{food?.name ?? 'Unknown food'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMealType(entry.mealType)} · {entry.quantityGrams}g
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {food ? Math.round((food.caloriesPer100g * entry.quantityGrams) / 100) : 0} kcal
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weekly Averages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold">{weeklyAverages.calories}</p>
              <p className="text-xs text-muted-foreground">kcal/day</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{weeklyAverages.protein}g</p>
              <p className="text-xs text-muted-foreground">protein</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{weeklyAverages.carbs}g</p>
              <p className="text-xs text-muted-foreground">carbs</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{weeklyAverages.fat}g</p>
              <p className="text-xs text-muted-foreground">fat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Graph */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Weight</CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList className="h-8">
                <TabsTrigger value="1m" className="text-xs px-2">1M</TabsTrigger>
                <TabsTrigger value="3m" className="text-xs px-2">3M</TabsTrigger>
                <TabsTrigger value="1y" className="text-xs px-2">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <LineChart
            data={weightData.map((d) => ({ date: d.date, weight: d.weight }))}
            lines={[{ dataKey: 'weight', name: 'Weight', color: 'hsl(var(--primary))' }]}
            height={180}
            yDomain={weightDomain}
            referenceLines={[{ y: weightGoalKg, label: 'Goal', color: 'hsl(var(--chart-2))' }]}
            formatYAxis={(v) => `${v}kg`}
            formatTooltip={(v) => `${v} kg`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
