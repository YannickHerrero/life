'use client';

import { useMemo } from 'react';
import { useNavigation } from '@/lib/navigation-context';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityHeatmap } from '@/components/charts/activity-heatmap';
import { AreaChart } from '@/components/charts/area-chart';
import { Flame, BookOpen, ChevronRight } from 'lucide-react';

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Activity type colors (shades of white)
const ACTIVITY_COLORS = {
  flashcards: '#ffffff', // white
  reading: '#e5e5e5',    // neutral-200
  watching: '#a3a3a3',   // neutral-400
  listening: '#737373',  // neutral-500
} as const;

const ACTIVITY_LABELS = {
  flashcards: 'Flashcards',
  reading: 'Reading',
  watching: 'Watching',
  listening: 'Listening',
} as const;

export function Japanese() {
  const { navigate } = useNavigation();
  const japaneseStats = useAppStore((s) => s.japaneseStats);
  const japaneseActivities = useAppStore((s) => s.japaneseActivities);

  // Convert Map to the format expected by heatmap
  const heatmapData = useMemo(() => {
    return japaneseStats.dailyTimeMap;
  }, [japaneseStats.dailyTimeMap]);

  // Compute area chart data for last 30 days
  const areaChartData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Create a map of date -> activity type -> minutes
    const dailyByType = new Map<string, Record<string, number>>();

    // Initialize all 30 days with zero values
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(thirtyDaysAgo.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyByType.set(dateStr, {
        flashcards: 0,
        reading: 0,
        watching: 0,
        listening: 0,
      });
    }

    // Aggregate activities by date and type
    for (const activity of japaneseActivities) {
      const activityDate = new Date(activity.date);
      if (activityDate >= thirtyDaysAgo && activityDate <= now) {
        const existing = dailyByType.get(activity.date);
        if (existing) {
          existing[activity.type] = (existing[activity.type] || 0) + activity.durationMinutes;
        }
      }
    }

    // Convert to array format for Recharts
    return Array.from(dailyByType.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        ...values,
      }));
  }, [japaneseActivities]);

  const areaConfig = [
    { dataKey: 'flashcards', name: ACTIVITY_LABELS.flashcards, color: ACTIVITY_COLORS.flashcards },
    { dataKey: 'reading', name: ACTIVITY_LABELS.reading, color: ACTIVITY_COLORS.reading },
    { dataKey: 'watching', name: ACTIVITY_LABELS.watching, color: ACTIVITY_COLORS.watching },
    { dataKey: 'listening', name: ACTIVITY_LABELS.listening, color: ACTIVITY_COLORS.listening },
  ];

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Japanese Stats</h2>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{japaneseStats.streaks.current}</span>
              <span className="text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Longest Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{japaneseStats.streaks.longest}</span>
              <span className="text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flashcard Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cards Learned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{japaneseStats.flashcardStats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{japaneseStats.flashcardStats.thisYear}</p>
              <p className="text-sm text-muted-foreground">This Year</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{japaneseStats.flashcardStats.thisMonth}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{japaneseStats.flashcardStats.thisWeek}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Study Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{formatMinutes(japaneseStats.timeStats.total)}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(japaneseStats.timeStats.thisYear)}</p>
              <p className="text-sm text-muted-foreground">This Year</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(japaneseStats.timeStats.thisMonth)}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(japaneseStats.timeStats.thisWeek)}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Activity (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={areaChartData}
            areas={areaConfig}
            height={200}
            formatYAxis={(value) => `${value}m`}
            formatTooltip={(value) => `${value} min`}
          />
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap
            data={heatmapData}
            maxValue={120}
          />
        </CardContent>
      </Card>

      {/* Reading Details Link */}
      <button
        onClick={() => navigate('japanese', 'japanese/reading')}
        className="mt-2 block w-full text-left"
      >
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5" />
              <div>
                <p className="font-medium">Reading</p>
                <p className="text-sm text-muted-foreground">
                  View your book collection
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </button>
    </div>
  );
}
