'use client';

import { useState } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface AreaConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface AreaChartProps {
  data: DataPoint[];
  areas: AreaConfig[];
  height?: number;
  yAxisLabel?: string;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
}

export function AreaChart({
  data,
  areas,
  height = 200,
  yAxisLabel,
  formatYAxis,
  formatTooltip,
}: AreaChartProps) {
  const [visibleAreas, setVisibleAreas] = useState<Set<string>>(
    new Set(areas.map((a) => a.dataKey))
  );

  const toggleArea = (dataKey: string) => {
    setVisibleAreas((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        // Don't allow hiding all areas
        if (next.size > 1) {
          next.delete(dataKey);
        }
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: 12 },
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: 12,
            }}
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              formatTooltip ? formatTooltip(value) : value,
              name,
            ]}
          />
          {areas.map((area) =>
            visibleAreas.has(area.dataKey) ? (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                name={area.name}
                stackId="1"
                stroke={area.color}
                fill={area.color}
                fillOpacity={0.6}
              />
            ) : null
          )}
        </RechartsAreaChart>
      </ResponsiveContainer>

      {/* Toggle buttons */}
      <div className="flex gap-1.5 mt-3">
        {areas.map((area) => {
          const isActive = visibleAreas.has(area.dataKey);
          return (
            <button
              key={area.dataKey}
              onClick={() => toggleArea(area.dataKey)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                isActive
                  ? 'border-transparent text-black'
                  : 'border-muted-foreground/30 text-muted-foreground bg-transparent'
              }`}
              style={{
                backgroundColor: isActive ? area.color : undefined,
              }}
            >
              {area.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
