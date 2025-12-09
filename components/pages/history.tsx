'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JapaneseHistory } from '@/components/history/japanese-history';
import { NutritionHistory } from '@/components/history/nutrition-history';
import { SportHistory } from '@/components/history/sport-history';

type HistoryTab = 'japanese' | 'nutrition' | 'sport';

export function History() {
  const [activeTab, setActiveTab] = useState<HistoryTab>('japanese');

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">History</h2>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HistoryTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="japanese">Japanese</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="sport">Sport</TabsTrigger>
        </TabsList>

        <TabsContent value="japanese" className="mt-4">
          <JapaneseHistory />
        </TabsContent>

        <TabsContent value="nutrition" className="mt-4">
          <NutritionHistory />
        </TabsContent>

        <TabsContent value="sport" className="mt-4">
          <SportHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
