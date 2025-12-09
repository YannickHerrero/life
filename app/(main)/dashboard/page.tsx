'use client';

import { useState, useEffect, useMemo } from 'react';
import { Languages, UtensilsCrossed, Dumbbell, Scale, Flame } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { JapaneseInput } from '@/components/forms/japanese-input';
import { MealInput } from '@/components/forms/meal-input';
import { SportInput } from '@/components/forms/sport-input';
import { WeightInput } from '@/components/forms/weight-input';
import { db } from '@/lib/db';
import { today } from '@/types';

type InputType = 'japanese' | 'meal' | 'sport' | 'weight' | null;

const inputConfig = {
  japanese: {
    title: 'Log Japanese',
    icon: Languages,
    component: JapaneseInput,
    sheetClassName: 'h-[85dvh]',
  },
  meal: {
    title: 'Log Meal',
    icon: UtensilsCrossed,
    component: MealInput,
    sheetClassName: 'h-[85dvh]',
  },
  sport: {
    title: 'Log Sport',
    icon: Dumbbell,
    component: SportInput,
    sheetClassName: 'h-[85dvh]',
  },
  weight: {
    title: 'Log Weight',
    icon: Scale,
    component: WeightInput,
    sheetClassName: '',
  },
};

export default function DashboardPage() {
  const [activeInput, setActiveInput] = useState<InputType>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const todayStr = today();

  // Get today's Japanese activities
  const japaneseActivities = useLiveQuery(
    () => db.japaneseActivities
      .where('date')
      .equals(todayStr)
      .filter((a) => !a.deletedAt)
      .toArray(),
    [todayStr]
  );

  // Get today's sport activities
  const sportActivities = useLiveQuery(
    () => db.sportActivities
      .where('date')
      .equals(todayStr)
      .filter((a) => !a.deletedAt)
      .toArray(),
    [todayStr]
  );

  // Get today's meal entries
  const mealEntries = useLiveQuery(
    () => db.mealEntries
      .where('date')
      .equals(todayStr)
      .filter((m) => !m.deletedAt)
      .toArray(),
    [todayStr]
  );

  // Get today's weight entry
  const todayWeight = useLiveQuery(
    () => db.weightEntries
      .where('date')
      .equals(todayStr)
      .filter((w) => !w.deletedAt)
      .first(),
    [todayStr]
  );

  // Calculate calories when meal entries change
  useEffect(() => {
    const calculateCalories = async () => {
      if (!mealEntries) {
        setTodayCalories(0);
        return;
      }

      let total = 0;
      for (const entry of mealEntries) {
        const food = await db.foods.get(entry.foodId);
        if (food) {
          total += (food.caloriesPer100g * entry.quantityGrams) / 100;
        }
      }
      setTodayCalories(Math.round(total));
    };

    calculateCalories();
  }, [mealEntries]);

  // Calculate totals
  const japaneseMinutes = useMemo(() => {
    if (!japaneseActivities) return 0;
    return japaneseActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
  }, [japaneseActivities]);

  const sportMinutes = useMemo(() => {
    if (!sportActivities) return 0;
    return sportActivities.reduce((sum, a) => sum + a.durationMinutes, 0);
  }, [sportActivities]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

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
    <div className="p-4 space-y-6">
      {/* Overview Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="py-3">
            <CardContent className="px-3 text-center">
              <Languages className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{formatTime(japaneseMinutes)}</p>
              <p className="text-xs text-muted-foreground">Japanese</p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-3 text-center">
              <Flame className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{todayCalories}</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </CardContent>
          </Card>
          <Card className="py-3">
            <CardContent className="px-3 text-center">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{formatTime(sportMinutes)}</p>
              <p className="text-xs text-muted-foreground">Sport</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
        {(Object.keys(inputConfig) as InputType[]).filter(Boolean).map((key) => {
          if (!key) return null;
          const config = inputConfig[key];
          const Icon = config.icon;

          return (
            <Button
              key={key}
              variant="outline"
              className="h-32 flex flex-col gap-3 text-base"
              onClick={() => handleInputClick(key)}
            >
              <Icon className="h-8 w-8" />
              <span>{config.title}</span>
            </Button>
          );
        })}
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
  );
}
