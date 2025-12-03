'use client';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

interface TimeSeriesChartProps {
  title: string;
  data: { day: string; value: number }[];
  color?: string;
  type?: 'line' | 'area';
  loading?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  subtitle?: string;
}

function CustomTooltip({ 
  active, 
  payload, 
  label,
  formatter 
}: TooltipProps<number, string> & { formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value as number;
  const formattedValue = formatter ? formatter(value) : value.toLocaleString();

  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{formattedValue}</p>
    </div>
  );
}

export function TimeSeriesChart({
  title,
  data,
  color = CHART_COLORS.sends,
  type = 'area',
  loading = false,
  className,
  valueFormatter,
  height = 280,
  subtitle,
}: TimeSeriesChartProps) {
  // Format day labels to be shorter (e.g., "Nov 25")
  const formattedData = data.map(d => ({
    ...d,
    displayDay: new Date(d.day).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
  }));

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <ChartComponent
                data={formattedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--border)" 
                  vertical={false}
                />
                <XAxis
                  dataKey="displayDay"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickMargin={8}
                  tickFormatter={(v) => valueFormatter ? valueFormatter(v) : v.toLocaleString()}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={valueFormatter} />}
                  cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }}
                />
                {type === 'area' ? (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${color.replace('#', '')})`}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                ) : (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: 'var(--surface)' }}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                )}
              </ChartComponent>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

