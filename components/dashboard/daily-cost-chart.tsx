'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
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

interface DailyCostChartProps {
  data: { day: string; value: number }[];
  loading?: boolean;
  className?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
}

function CustomTooltip({ 
  active, 
  payload, 
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value as number;
  const rawDate = payload[0]?.payload?.rawDay;

  // Format the date nicely without timezone conversion
  let displayDate = label;
  if (rawDate) {
    const [year, month, day] = rawDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    displayDate = date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-secondary mb-1">
        {displayDate}
      </p>
      <p className="text-sm font-semibold text-text-primary">
        ${value.toFixed(4)}
      </p>
    </div>
  );
}

export function DailyCostChart({
  data,
  loading = false,
  className,
  timezone = 'America/Los_Angeles',
  startDate,
  endDate,
}: DailyCostChartProps) {
  // Format data with timezone-aware labels and fill gaps
  const formattedData = useMemo(() => {
    if (!data.length) return [];

    // Create a map of existing data (data.day is already in YYYY-MM-DD format from API)
    const dataMap = new Map(data.map(d => [d.day, d.value]));
    
    // Generate all dates in range using local date parsing to avoid timezone shifts
    const parseDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d); // months are 0-indexed
    };
    
    const start = startDate ? parseDate(startDate) : parseDate(data[0].day);
    const end = endDate ? parseDate(endDate) : parseDate(data[data.length - 1].day);
    
    const allDates: { day: string; value: number; rawDay: string; displayDay: string }[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      // Format as YYYY-MM-DD using local date components
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dayStr = `${year}-${month}-${day}`;
      
      const value = dataMap.get(dayStr) || 0;
      
      // Format display label - just use local date formatting
      const displayDay = current.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC' // treat the date as-is without timezone conversion
      });
      
      allDates.push({
        day: dayStr,
        rawDay: dayStr,
        value,
        displayDay,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return allDates;
  }, [data, startDate, endDate]);

  // Calculate totals
  const totalCost = useMemo(() => 
    formattedData.reduce((sum, d) => sum + d.value, 0),
    [formattedData]
  );

  const avgDailyCost = useMemo(() => 
    formattedData.length > 0 ? totalCost / formattedData.length : 0,
    [formattedData, totalCost]
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Daily LLM Cost</CardTitle>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-text-secondary">
                Total: <span className="font-semibold text-text-primary">${totalCost.toFixed(2)}</span>
              </div>
              <div className="text-text-secondary">
                Avg: <span className="font-semibold text-text-primary">${avgDailyCost.toFixed(4)}/day</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <AreaChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
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
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickMargin={8}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                  width={60}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                  animationDuration={1000}
                  animationEasing="ease-out"
                  dot={({ cx, cy, payload }: { cx: number; cy: number; payload: { value: number } }) => {
                    // Show dots for days with actual costs
                    if (payload.value > 0) {
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="#8B5CF6"
                          stroke="var(--surface)"
                          strokeWidth={2}
                        />
                      );
                    }
                    // Return invisible dot instead of null to satisfy TypeScript
                    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} />;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

