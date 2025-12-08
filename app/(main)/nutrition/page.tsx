'use client';

import { useState, useEffect } from 'react';
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
import { useNutritionStats } from '@/hooks/useNutrition';
import { useWeight } from '@/hooks/useWeight';
import type { MacroTotals } from '@/types';

type Period = '1m' | '3m' | '1y';

export default function NutritionPage() {
  const { getDailyMacros, getMealsForDate, getWeeklyAverages, mealEntries } = useNutritionStats();
  const { getWeightHistory } = useWeight();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyMacros, setDailyMacros] = useState<MacroTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyAverages, setWeeklyAverages] = useState<MacroTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState<{ entry: { mealType: string; quantityGrams: number }; food: { name: string; caloriesPer100g: number } | undefined }[]>([]);
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);
  const [period, setPeriod] = useState<Period>('3m');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Load daily data when date changes
  useEffect(() => {
    getDailyMacros(dateStr).then(setDailyMacros);
    getMealsForDate(dateStr).then(setMeals);
  }, [dateStr, getDailyMacros, getMealsForDate]);

  // Load weekly averages
  useEffect(() => {
    getWeeklyAverages().then(setWeeklyAverages);
  }, [getWeeklyAverages, mealEntries]);

  // Load weight history based on period
  useEffect(() => {
    const monthsBack = period === '1m' ? 1 : period === '3m' ? 3 : 12;
    getWeightHistory(monthsBack).then(setWeightData);
  }, [period, getWeightHistory]);

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
            formatYAxis={(v) => `${v}kg`}
            formatTooltip={(v) => `${v} kg`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
