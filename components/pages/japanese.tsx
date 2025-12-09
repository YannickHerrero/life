'use client';

import { useMemo } from 'react';
import { useNavigation } from '@/lib/navigation-context';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityHeatmap } from '@/components/charts/activity-heatmap';
import { Flame, BookOpen, ChevronRight } from 'lucide-react';

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function Japanese() {
  const { navigate } = useNavigation();
  const japaneseStats = useAppStore((s) => s.japaneseStats);

  // Convert Map to the format expected by heatmap
  const heatmapData = useMemo(() => {
    return japaneseStats.dailyTimeMap;
  }, [japaneseStats.dailyTimeMap]);

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
