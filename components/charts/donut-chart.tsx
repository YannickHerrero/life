'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface DonutChartProps {
  data: DataPoint[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  height = 200,
  innerRadius = 60,
  outerRadius = 80,
  formatValue,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter out zero values
  const filteredData = data.filter((d) => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const total = filteredData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {filteredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  style={{ transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: 12,
              }}
              formatter={(value: number) => [
                formatValue ? formatValue(value) : value,
                '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <span className="text-2xl font-bold">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {filteredData.map((entry, index) => {
          const percentage = Math.round((entry.value / total) * 100);
          return (
            <div
              key={entry.name}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${
                activeIndex === null || activeIndex === index
                  ? 'opacity-100'
                  : 'opacity-50'
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.name} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
