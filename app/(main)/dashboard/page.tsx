'use client';

import { useState } from 'react';
import { Languages, UtensilsCrossed, Dumbbell, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type InputType = 'japanese' | 'meal' | 'sport' | 'weight' | null;

const inputConfig = {
  japanese: {
    title: 'Log Japanese',
    icon: Languages,
    component: JapaneseInput,
  },
  meal: {
    title: 'Log Meal',
    icon: UtensilsCrossed,
    component: MealInput,
  },
  sport: {
    title: 'Log Sport',
    icon: Dumbbell,
    component: SportInput,
  },
  weight: {
    title: 'Log Weight',
    icon: Scale,
    component: WeightInput,
  },
};

export default function DashboardPage() {
  const [activeInput, setActiveInput] = useState<InputType>(null);

  const handleClose = () => {
    setActiveInput(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>

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
              onClick={() => setActiveInput(key)}
            >
              <Icon className="h-8 w-8" />
              <span>{config.title}</span>
            </Button>
          );
        })}
      </div>

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
            <SheetContent side="bottom" className="h-[85dvh] rounded-t-xl px-6 pb-6">
              <SheetHeader>
                <SheetTitle>{config.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto h-[calc(100%-4rem)]">
                <Component onSuccess={handleClose} />
              </div>
            </SheetContent>
          </Sheet>
        );
      })}
    </div>
  );
}
