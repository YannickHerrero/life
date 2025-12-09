'use client';

import { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  data: Map<string, number>;
  year?: number;
  colorScale?: string[];
  maxValue?: number;
  onDayClick?: (date: string, value: number) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Default green color scale (like GitHub)
const DEFAULT_COLORS = [
  'bg-muted',
  'bg-green-200 dark:bg-green-900',
  'bg-green-300 dark:bg-green-800',
  'bg-green-400 dark:bg-green-700',
  'bg-green-500 dark:bg-green-600',
];

export function ActivityHeatmap({
  data,
  year = new Date().getFullYear(),
  colorScale = DEFAULT_COLORS,
  maxValue,
  onDayClick,
}: ActivityHeatmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { weeks, monthLabels, computedMaxValue, currentWeekIndex } = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    // Adjust start to previous Sunday
    const firstDay = startDate.getDay();
    const adjustedStart = new Date(startDate);
    adjustedStart.setDate(adjustedStart.getDate() - firstDay);

    // Generate all weeks
    const weeks: { date: Date; value: number }[][] = [];
    let currentWeek: { date: Date; value: number }[] = [];
    const currentDate = new Date(adjustedStart);

    // Find max value if not provided
    let max = maxValue ?? 0;
    if (!maxValue) {
      data.forEach((value) => {
        if (value > max) max = value;
      });
    }

    while (currentDate <= endDate || currentWeek.length > 0) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const value = data.get(dateStr) ?? 0;

      currentWeek.push({
        date: new Date(currentDate),
        value,
      });

      currentDate.setDate(currentDate.getDate() + 1);

      if (currentDate.getDay() === 0 || currentDate > endDate) {
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

    return { weeks, monthLabels, computedMaxValue: max || 1, currentWeekIndex };
  }, [data, year, maxValue]);

  const getColorClass = (value: number): string => {
    if (value === 0) return colorScale[0];

    const intensity = Math.min(value / computedMaxValue, 1);
    const colorIndex = Math.ceil(intensity * (colorScale.length - 1));
    return colorScale[Math.min(colorIndex, colorScale.length - 1)];
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
                {week.map(({ date, value }, dayIndex) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const isCurrentYear = date.getFullYear() === year;

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => isCurrentYear && onDayClick?.(dateStr, value)}
                      disabled={!isCurrentYear}
                      className={cn(
                        'w-[10px] h-[10px] rounded-sm transition-colors',
                        isCurrentYear ? getColorClass(value) : 'bg-transparent',
                        isCurrentYear && onDayClick && 'hover:ring-1 hover:ring-foreground cursor-pointer',
                        !isCurrentYear && 'cursor-default'
                      )}
                      title={isCurrentYear ? `${dateStr}: ${value}` : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
          <span>Less</span>
          {colorScale.map((color, i) => (
            <div
              key={i}
              className={cn('w-[10px] h-[10px] rounded-sm', color)}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
