'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Languages, Dumbbell, Scale, Flame, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { JapaneseInput } from '@/components/forms/japanese-input';
import { MealInput } from '@/components/forms/meal-input';
import { SportInput } from '@/components/forms/sport-input';
import { WeightInput } from '@/components/forms/weight-input';
import { useAppStore } from '@/lib/store';
import { useSync } from '@/hooks/useSync';
import { today } from '@/types';

type InputType = 'japanese' | 'meal' | 'sport' | 'weight' | null;

const inputConfig = {
  japanese: {
    title: 'Log Japanese',
    component: JapaneseInput,
    sheetClassName: 'h-[85dvh]',
  },
  meal: {
    title: 'Log Meal',
    component: MealInput,
    sheetClassName: 'h-[85dvh]',
  },
  sport: {
    title: 'Log Sport',
    component: SportInput,
    sheetClassName: 'h-[85dvh]',
  },
  weight: {
    title: 'Log Weight',
    component: WeightInput,
    sheetClassName: '',
  },
};

export function Dashboard() {
  const [activeInput, setActiveInput] = useState<InputType>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const todayStr = today();
  const { sync } = useSync();

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    const result = await sync();
    if (result.success) {
      toast.success('Synced successfully');
    } else {
      toast.error(result.error ?? 'Sync failed');
    }
  }, [sync]);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get data from store
  const appStreak = useAppStore((s) => s.appStreak);
  const japaneseActivities = useAppStore((s) => s.japaneseActivities);
  const sportActivities = useAppStore((s) => s.sportActivities);
  const mealEntries = useAppStore((s) => s.mealEntries);
  const foods = useAppStore((s) => s.foods);
  const weightEntries = useAppStore((s) => s.weightEntries);

  // Filter today's data
  const todayJapanese = useMemo(
    () => japaneseActivities.filter((a) => a.date === todayStr),
    [japaneseActivities, todayStr]
  );

  const todaySport = useMemo(
    () => sportActivities.filter((a) => a.date === todayStr),
    [sportActivities, todayStr]
  );

  const todayMeals = useMemo(
    () => mealEntries.filter((m) => m.date === todayStr),
    [mealEntries, todayStr]
  );

  const todayWeight = useMemo(
    () => weightEntries.find((w) => w.date === todayStr),
    [weightEntries, todayStr]
  );

  // Calculate calories from today's meals
  const todayCalories = useMemo(() => {
    if (!todayMeals.length) return 0;

    const foodMap = new Map(foods.map((f) => [f.id, f]));
    return Math.round(
      todayMeals.reduce((sum, entry) => {
        const food = foodMap.get(entry.foodId);
        return food ? sum + (food.caloriesPer100g * entry.quantityGrams) / 100 : sum;
      }, 0)
    );
  }, [todayMeals, foods]);

  // Calculate totals
  const japaneseMinutes = useMemo(
    () => todayJapanese.reduce((sum, a) => sum + a.durationMinutes, 0),
    [todayJapanese]
  );

  const sportMinutes = useMemo(
    () => todaySport.reduce((sum, a) => sum + a.durationMinutes, 0),
    [todaySport]
  );

  // Calculate latest weight and comparison
  const weightData = useMemo(() => {
    if (!weightEntries.length) return null;

    // Sort entries by date descending to get latest
    const sorted = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];

    if (sorted.length < 2) {
      // Only one entry, no comparison possible
      return { current: latest.weightKg, diff: null };
    }

    // Get date from 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Find the entry closest to a week ago (or older)
    // First, try to find an entry from exactly a week ago or before
    const olderEntries = sorted.filter((e) => e.date <= weekAgoStr);

    let comparisonEntry;
    if (olderEntries.length > 0) {
      // Use the most recent entry that's at least a week old
      comparisonEntry = olderEntries[0];
    } else {
      // Not enough history, use the oldest available entry
      comparisonEntry = sorted[sorted.length - 1];
    }

    // Don't compare to self
    if (comparisonEntry.id === latest.id) {
      return { current: latest.weightKg, diff: null };
    }

    const diff = latest.weightKg - comparisonEntry.weightKg;
    return { current: latest.weightKg, diff };
  }, [weightEntries]);

  // Format time display for stats
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format clock time (12-hour format)
  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date display
  const formatDate = (date: Date) => {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return { dayOfWeek, monthDay };
  };

  const { dayOfWeek, monthDay } = formatDate(currentTime);

  const handleClose = () => {
    setActiveInput(null);
  };

  const handleInputClick = (key: InputType) => {
    if (key === 'weight' && todayWeight) {
      toast.info(`Weight already logged today: ${todayWeight.weightKg} kg`);
      return;
    }
    setActiveInput(key);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-[calc(100dvh-7.5rem)]">
      <div className="p-4 flex flex-col h-full">
        {/* Clock/Calendar Section */}
        <section className="flex-1 flex flex-col items-center justify-center">
          <p className="text-6xl font-light tracking-tight">
            {formatClockTime(currentTime)}
          </p>
          <p className="text-lg text-muted-foreground mt-2">
            {dayOfWeek}, {monthDay}
          </p>
          {appStreak > 0 && (
            <div className="flex items-center gap-1.5 mt-6 text-muted-foreground">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{appStreak} day streak</span>
            </div>
          )}
        </section>

        {/* Overview Section - Aligned to Bottom */}
        <section className="mt-auto pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="py-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
              onClick={() => handleInputClick('japanese')}
            >
              <CardContent className="px-3 text-center">
                <Languages className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{formatDuration(japaneseMinutes)}</p>
                <p className="text-xs text-muted-foreground">Japanese</p>
              </CardContent>
            </Card>
            <Card 
              className="py-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
              onClick={() => handleInputClick('meal')}
            >
              <CardContent className="px-3 text-center">
                <Flame className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{todayCalories}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </CardContent>
            </Card>
            <Card 
              className="py-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
              onClick={() => handleInputClick('sport')}
            >
              <CardContent className="px-3 text-center">
                <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">{formatDuration(sportMinutes)}</p>
                <p className="text-xs text-muted-foreground">Sport</p>
              </CardContent>
            </Card>
            <Card 
              className="py-3 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
              onClick={() => handleInputClick('weight')}
            >
              <CardContent className="px-3 text-center">
                <Scale className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {weightData ? `${weightData.current} kg` : '—'}
                </p>
                {weightData?.diff !== null && weightData?.diff !== undefined ? (
                  <p className={`text-xs ${weightData.diff > 0 ? 'text-red-500' : weightData.diff < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {weightData.diff > 0 ? '+' : ''}{weightData.diff.toFixed(1)} kg
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Weight</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Input Sheets */}
        {(Object.keys(inputConfig) as InputType[]).filter(Boolean).map((key) => {
          if (!key) return null;
          const config = inputConfig[key];
          const Component = config.component;

          return (
            <Sheet
              key={key}
              open={activeInput === key}
              onOpenChange={(open) => !open && handleClose()}
            >
              <SheetContent side="bottom" className={`${config.sheetClassName} rounded-t-xl px-6 pb-6`}>
                <SheetHeader>
                  <SheetTitle>{config.title}</SheetTitle>
                </SheetHeader>
                <div className={`mt-4 ${config.sheetClassName ? 'overflow-y-auto h-[calc(100%-4rem)]' : ''}`}>
                  <Component onSuccess={handleClose} />
                </div>
              </SheetContent>
            </Sheet>
          );
        })}
      </div>
    </PullToRefresh>
  );
}
