'use client';

import { useMemo, useState } from 'react';
import { useNavigation } from '@/lib/navigation-context';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityHeatmap } from '@/components/charts/activity-heatmap';
import { AreaChart } from '@/components/charts/area-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { LineChart } from '@/components/charts/line-chart';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Flame, BookOpen, ChevronRight, TrendingUp, TrendingDown, Minus, Trophy, Calendar, Target } from 'lucide-react';

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonth(monthStr: string): string {
  if (!monthStr) return '-';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Activity type colors (shades of white/gray)
const ACTIVITY_COLORS = {
  flashcards: '#ffffff', // white
  reading: '#d4d4d4',    // neutral-300
  watching: '#a3a3a3',   // neutral-400
  listening: '#737373',  // neutral-500
} as const;

const ACTIVITY_LABELS = {
  flashcards: 'Flashcards',
  reading: 'Reading',
  watching: 'Watching',
  listening: 'Listening',
} as const;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type PeriodFilter = 'week' | 'month' | 'year' | 'all';

export function Japanese() {
  const { navigate } = useNavigation();
  const japaneseStats = useAppStore((s) => s.japaneseStats);
  const japaneseActivities = useAppStore((s) => s.japaneseActivities);
  const books = useAppStore((s) => s.books);
  const settings = useAppStore((s) => s.settings);
  const dailyGoal = settings.japaneseDailyGoalMinutes;

  const [breakdownPeriod, setBreakdownPeriod] = useState<PeriodFilter>('month');

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

  // Activity breakdown data based on period
  const breakdownData = useMemo(() => {
    const { timeByType } = japaneseStats;
    const getMinutes = (type: keyof typeof timeByType) => {
      switch (breakdownPeriod) {
        case 'week': return timeByType[type].thisWeek;
        case 'month': return timeByType[type].thisMonth;
        case 'year': return timeByType[type].thisYear;
        case 'all': return timeByType[type].total;
      }
    };

    return [
      { name: ACTIVITY_LABELS.flashcards, value: getMinutes('flashcards'), color: ACTIVITY_COLORS.flashcards },
      { name: ACTIVITY_LABELS.reading, value: getMinutes('reading'), color: ACTIVITY_COLORS.reading },
      { name: ACTIVITY_LABELS.watching, value: getMinutes('watching'), color: ACTIVITY_COLORS.watching },
      { name: ACTIVITY_LABELS.listening, value: getMinutes('listening'), color: ACTIVITY_COLORS.listening },
    ];
  }, [japaneseStats.timeByType, breakdownPeriod]);

  const breakdownTotal = breakdownData.reduce((sum, d) => sum + d.value, 0);

  // Day of week data
  const dayOfWeekData = useMemo(() => {
    return japaneseStats.timeByDayOfWeek.map((minutes, index) => ({
      label: DAY_LABELS[index],
      value: minutes,
    }));
  }, [japaneseStats.timeByDayOfWeek]);

  // Hour of day data
  const hourOfDayData = useMemo(() => {
    return japaneseStats.timeByHourOfDay.map((minutes, hour) => ({
      label: hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
      value: minutes,
    }));
  }, [japaneseStats.timeByHourOfDay]);

  // Weekly comparison bar data
  const weeklyComparisonData = useMemo(() => {
    return [
      { label: 'Last Week', value: japaneseStats.weeklyComparison.lastWeek },
      { label: 'This Week', value: japaneseStats.weeklyComparison.thisWeek },
    ];
  }, [japaneseStats.weeklyComparison]);

  // Monthly trend line data
  const monthlyTrendData = useMemo(() => {
    return japaneseStats.monthlyTrend.map((d) => ({
      date: d.month,
      minutes: d.minutes,
    }));
  }, [japaneseStats.monthlyTrend]);

  // Book stats
  const bookStats = useMemo(() => {
    const inProgress = books.filter((b) => !b.completed).length;
    const completed = books.filter((b) => b.completed).length;
    const totalReadingTime = books.reduce((sum, b) => sum + b.totalReadingTimeMinutes, 0);
    return { inProgress, completed, totalReadingTime };
  }, [books]);

  // Daily goal progress
  const goalProgress = japaneseStats.todayMinutes;
  const goalPercentage = Math.round((goalProgress / dailyGoal) * 100);
  const goalAchieved = goalProgress >= dailyGoal;

  // Weekly comparison trend
  const { change } = japaneseStats.weeklyComparison;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Japanese Stats</h2>

      {/* Daily Goal Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Today&apos;s Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <ProgressRing
              value={goalProgress}
              max={dailyGoal}
              size={100}
              strokeWidth={8}
              label={formatMinutes(goalProgress)}
              sublabel={`of ${formatMinutes(dailyGoal)}`}
            />
            <div className="flex-1">
              <p className={`text-lg font-medium ${goalAchieved ? 'text-green-500' : ''}`}>
                {goalAchieved ? 'Goal achieved!' : `${goalPercentage}% complete`}
              </p>
              <p className="text-sm text-muted-foreground">
                {goalAchieved 
                  ? `You studied ${formatMinutes(goalProgress - dailyGoal)} extra today!`
                  : `${formatMinutes(dailyGoal - goalProgress)} to go`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Average (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{formatMinutes(japaneseStats.weeklyAverage)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              vs Last Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <span className={`text-2xl font-bold ${trendColor}`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
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
          {japaneseStats.cardsPerSession > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg per session</span>
                <span className="font-medium">{japaneseStats.cardsPerSession} cards</span>
              </div>
            </div>
          )}
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

      {/* Activity Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Breakdown</CardTitle>
            <div className="flex gap-1">
              {(['week', 'month', 'year', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setBreakdownPeriod(period)}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    breakdownPeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {period === 'all' ? 'All' : period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DonutChart
            data={breakdownData}
            height={200}
            formatValue={(value) => formatMinutes(value)}
            centerValue={formatMinutes(breakdownTotal)}
            centerLabel="total"
          />
        </CardContent>
      </Card>

      {/* Weekly Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={weeklyComparisonData}
            height={150}
            color="#ffffff"
            formatYAxis={(value) => formatMinutes(value)}
            formatTooltip={(value) => formatMinutes(value)}
          />
        </CardContent>
      </Card>

      {/* Study by Day of Week */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={dayOfWeekData}
            height={150}
            color="#a3a3a3"
            formatYAxis={(value) => `${value}m`}
            formatTooltip={(value) => formatMinutes(value)}
          />
        </CardContent>
      </Card>

      {/* Activity by Hour of Day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity by Hour of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={hourOfDayData}
            height={150}
            color="#737373"
            formatYAxis={(value) => `${Math.round(value / 60)}h`}
            formatTooltip={(value) => formatMinutes(value)}
            xAxisInterval={5}
          />
        </CardContent>
      </Card>

      {/* Best Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Best Day</p>
              <p className="text-sm">{formatDate(japaneseStats.bestDay.date)}</p>
            </div>
            <p className="text-xl font-bold">{formatMinutes(japaneseStats.bestDay.minutes)}</p>
          </div>
          <div className="border-t pt-3 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Best Month</p>
              <p className="text-sm">{formatMonth(japaneseStats.bestMonth.date)}</p>
            </div>
            <p className="text-xl font-bold">{formatMinutes(japaneseStats.bestMonth.minutes)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Monthly Trend (12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            data={monthlyTrendData}
            lines={[{ dataKey: 'minutes', name: 'Study Time', color: '#ffffff' }]}
            height={180}
            formatYAxis={(value) => `${Math.round(value / 60)}h`}
            formatTooltip={(value) => formatMinutes(value)}
          />
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

      {/* Reading Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reading Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{bookStats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{bookStats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(bookStats.totalReadingTime)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
          </div>
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
