'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SportHeatmap } from '@/components/charts/sport-heatmap';
import { BarChart } from '@/components/charts/bar-chart';
import { useSportStats } from '@/hooks/useSport';
import { SportType } from '@/types';

type Period = '1m' | '3m' | '1y';

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function Sport() {
  const { getTimeStats, dailyActivityMap, getWeeklyRunningDistances } = useSportStats();
  const [period, setPeriod] = useState<Period>('3m');
  const [runningDistances, setRunningDistances] = useState<{ week: string; distance: number }[]>([]);

  const runningStats = getTimeStats(SportType.RUNNING);
  const workoutStats = getTimeStats(SportType.STREET_WORKOUT);
  const bikeStats = getTimeStats(SportType.BIKE);

  // Load running distances based on period
  useEffect(() => {
    const monthsBack = period === '1m' ? 1 : period === '3m' ? 3 : 12;
    const distances = getWeeklyRunningDistances(monthsBack);
    setRunningDistances(distances);
  }, [period, getWeeklyRunningDistances]);

  // Format bar chart data
  const barChartData = useMemo(() => {
    return runningDistances.map((d) => {
      const date = new Date(d.week);
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: d.distance,
      };
    });
  }, [runningDistances]);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Sport Stats</h2>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <SportHeatmap data={dailyActivityMap} />
        </CardContent>
      </Card>

      {/* Time Summaries */}
      <div className="grid grid-cols-1 gap-4">
        {/* Running */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold">{formatMinutes(runningStats.thisWeek)}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatMinutes(runningStats.thisMonth)}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatMinutes(runningStats.thisYear)}</p>
                <p className="text-xs text-muted-foreground">This Year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Street Workout */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Street Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold">{formatMinutes(workoutStats.thisWeek)}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatMinutes(workoutStats.thisMonth)}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatMinutes(workoutStats.thisYear)}</p>
                <p className="text-xs text-muted-foreground">This Year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bike */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bike</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold">{formatMinutes(bikeStats.thisWeek)}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatMinutes(bikeStats.thisMonth)}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div>
                <p className="text-xl font-bold">{formatMinutes(bikeStats.thisYear)}</p>
                <p className="text-xs text-muted-foreground">This Year</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Running Distance Graph */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Weekly Running Distance</CardTitle>
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
          <BarChart
            data={barChartData}
            height={180}
            color="hsl(var(--chart-1))"
            formatYAxis={(v) => `${v}km`}
            formatTooltip={(v) => `${v} km`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
