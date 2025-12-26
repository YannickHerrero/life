'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
}

interface ReferenceLineConfig {
  y: number;
  label?: string;
  color?: string;
}

interface LineChartProps {
  data: DataPoint[];
  lines: LineConfig[];
  height?: number;
  yAxisLabel?: string;
  yDomain?: [number | 'auto', number | 'auto'];
  referenceLines?: ReferenceLineConfig[];
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
}

export function LineChart({
  data,
  lines,
  height = 200,
  yAxisLabel,
  yDomain,
  referenceLines,
  formatYAxis,
  formatTooltip,
}: LineChartProps) {
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
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
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
          domain={yDomain}
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
        {lines.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="line"
          />
        )}
        {referenceLines?.map((refLine, index) => (
          <ReferenceLine
            key={index}
            y={refLine.y}
            stroke={refLine.color ?? 'hsl(var(--muted-foreground))'}
            strokeDasharray="5 5"
            label={refLine.label ? {
              value: refLine.label,
              position: 'right',
              fill: refLine.color ?? 'hsl(var(--muted-foreground))',
              fontSize: 11,
            } : undefined}
          />
        ))}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3, fill: line.color }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
