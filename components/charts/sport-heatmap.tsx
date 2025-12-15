'use client';

import { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SportHeatmapProps {
  data: Map<string, { running: boolean; workout: boolean }>;
  year?: number;
  onDayClick?: (date: string, activities: { running: boolean; workout: boolean }) => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Color classes for different activity combinations
const COLORS = {
  none: 'bg-muted',
  running: 'bg-blue-400 dark:bg-blue-600',
  workout: 'bg-green-400 dark:bg-green-600',
  both: 'bg-purple-400 dark:bg-purple-600',
};

export function SportHeatmap({
  data,
  year = new Date().getFullYear(),
  onDayClick,
}: SportHeatmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { weeks, monthLabels, currentWeekIndex } = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Adjust start to previous Monday
    const firstDay = startDate.getDay();
    const adjustedStart = new Date(startDate);
    adjustedStart.setDate(adjustedStart.getDate() - ((firstDay + 6) % 7));

    // Generate all weeks
    const weeks: { date: Date; activities: { running: boolean; workout: boolean } }[][] = [];
    let currentWeek: { date: Date; activities: { running: boolean; workout: boolean } }[] = [];
    const currentDate = new Date(adjustedStart);

    while (currentDate <= endDate || currentWeek.length > 0) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activities = data.get(dateStr) ?? { running: false, workout: false };

      currentWeek.push({
        date: new Date(currentDate),
        activities,
      });

      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate.getDay() === 1 || currentDate > endDate) {
        weeks.push(currentWeek);
        currentWeek = [];

        if (currentDate > endDate) break;
      }
    }

    // Generate month labels with their positions
    const monthLabels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const month = firstDayOfWeek.getMonth();
        if (month !== lastMonth && firstDayOfWeek.getFullYear() === year) {
          monthLabels.push({
            month: MONTHS[month],
            weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    // Find the week index containing today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let currentWeekIndex = -1;

    if (today.getFullYear() === year) {
      weeks.forEach((week, weekIndex) => {
        week.forEach(({ date }) => {
          if (date.toISOString().split('T')[0] === todayStr) {
            currentWeekIndex = weekIndex;
          }
        });
      });
    }

    return { weeks, monthLabels, currentWeekIndex };
  }, [data, year]);

  const getColorClass = (activities: { running: boolean; workout: boolean }): string => {
    if (activities.running && activities.workout) return COLORS.both;
    if (activities.running) return COLORS.running;
    if (activities.workout) return COLORS.workout;
    return COLORS.none;
  };

  const getTooltip = (date: string, activities: { running: boolean; workout: boolean }): string => {
    const parts = [date];
    if (activities.running) parts.push('Running');
    if (activities.workout) parts.push('Workout');
    if (!activities.running && !activities.workout) parts.push('No activity');
    return parts.join(': ');
  };

  // Scroll to current week on mount
  useEffect(() => {
    if (currentWeekIndex === -1 || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const cellWidth = 12; // 10px cell + 2px gap
    const dayLabelsWidth = 32; // approximate width of day labels (pr-2 + text)

    // Calculate scroll position to center the current week
    const targetScroll = dayLabelsWidth + currentWeekIndex * cellWidth - container.clientWidth / 2;

    // Clamp to valid scroll range (avoid overscrolling)
    const maxScroll = container.scrollWidth - container.clientWidth;
    const scrollPosition = Math.max(0, Math.min(targetScroll, maxScroll));

    container.scrollLeft = scrollPosition;
  }, [currentWeekIndex]);

  return (
    <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
      <div className="inline-block min-w-max">
        {/* Month labels */}
        <div className="flex ml-8 mb-1">
          {monthLabels.map(({ month, weekIndex }, i) => (
            <div
              key={`${month}-${i}`}
              className="text-xs text-muted-foreground"
              style={{
                marginLeft: i === 0 ? `${weekIndex * 12}px` : undefined,
                width: '36px',
              }}
            >
              {month}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Day labels */}
          <div className="flex flex-col justify-around pr-2 text-xs text-muted-foreground">
            {DAYS_OF_WEEK.filter((_, i) => i % 2 === 1).map((day) => (
              <div key={day} className="h-3 leading-3">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[2px]">
                {week.map(({ date, activities }, dayIndex) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const isCurrentYear = date.getFullYear() === year;

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => isCurrentYear && onDayClick?.(dateStr, activities)}
                      disabled={!isCurrentYear}
                      className={cn(
                        'w-[10px] h-[10px] rounded-sm transition-colors',
                        isCurrentYear ? getColorClass(activities) : 'bg-transparent',
                        isCurrentYear && onDayClick && 'hover:ring-1 hover:ring-foreground cursor-pointer',
                        !isCurrentYear && 'cursor-default'
                      )}
                      title={isCurrentYear ? getTooltip(dateStr, activities) : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className={cn('w-[10px] h-[10px] rounded-sm', COLORS.running)} />
            <span>Running</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn('w-[10px] h-[10px] rounded-sm', COLORS.workout)} />
            <span>Workout</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn('w-[10px] h-[10px] rounded-sm', COLORS.both)} />
            <span>Both</span>
          </div>
        </div>
      </div>
    </div>
  );
}
