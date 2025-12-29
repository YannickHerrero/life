'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  yAxisLabel?: string;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  xAxisInterval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
}

export function BarChart({
  data,
  height = 200,
  color = 'hsl(var(--primary))',
  yAxisLabel,
  formatYAxis,
  formatTooltip,
  xAxisInterval = 0,
}: BarChartProps) {
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          className="text-muted-foreground"
          tickLine={false}
          axisLine={false}
          interval={xAxisInterval}
          angle={-45}
          textAnchor="end"
          height={50}
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
          formatter={(value: number) => [
            formatTooltip ? formatTooltip(value) : value,
            'Distance',
          ]}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
