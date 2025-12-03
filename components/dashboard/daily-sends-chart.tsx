'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Calendar, BarChart3 } from 'lucide-react';
import type { DailySend } from '@/hooks/use-metrics';

interface DailySendsChartProps {
  data: DailySend[];
  startDate: string;
  endDate: string;
  loading?: boolean;
  className?: string;
  selectedDate?: string;
  onDateClick?: (date: string) => void;
}

function CustomTooltip({ 
  active, 
  payload, 
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const count = payload[0].value as number;
  const date = payload[0].payload.fullDate;

  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-secondary mb-1">
        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
      </p>
      <p className="text-sm font-semibold text-text-primary">
        {count.toLocaleString()} {count === 1 ? 'send' : 'sends'}
      </p>
    </div>
  );
}

export function DailySendsChart({
  data,
  startDate,
  endDate,
  loading = false,
  className,
  selectedDate,
  onDateClick,
}: DailySendsChartProps) {
  // Calculate if it's a single day selection
  const isSingleDay = startDate === endDate;

  // Format date range display
  const dateRangeDisplay = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isSingleDay) {
      return `Daily sends on ${format(start, 'MMMM d, yyyy')}`;
    }
    
    return `Daily sends from ${format(start, 'MMM d, yyyy')} to ${format(end, 'MMM d, yyyy')}`;
  }, [startDate, endDate, isSingleDay]);

  // Format data for chart
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      displayDate: format(new Date(d.date), 'MMM d'),
      shortDate: format(new Date(d.date), 'd'),
      fullDate: d.date,
      isSelected: d.date === selectedDate,
    }));
  }, [data, selectedDate]);

  // Calculate total and average
  const totalSends = useMemo(() => 
    data.reduce((sum, d) => sum + d.count, 0), 
    [data]
  );
  
  const avgSends = useMemo(() => 
    data.length > 0 ? Math.round(totalSends / data.length) : 0, 
    [data, totalSends]
  );

  const maxSends = useMemo(() => 
    Math.max(...data.map(d => d.count), 1), 
    [data]
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-64" />
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
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent-primary" />
                Daily Email Sends
              </CardTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                <p className="text-xs text-text-secondary">
                  {dateRangeDisplay}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-text-secondary">Total</p>
                <p className="font-semibold text-text-primary">{totalSends.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary">Avg/Day</p>
                <p className="font-semibold text-text-primary">{avgSends.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0] && onDateClick) {
                    onDateClick(e.activePayload[0].payload.fullDate);
                  }
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--border)" 
                  vertical={false}
                />
                <XAxis
                  dataKey={chartData.length > 14 ? 'shortDate' : 'displayDate'}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickMargin={8}
                  interval={chartData.length > 30 ? 'preserveStartEnd' : 0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  tickMargin={8}
                  domain={[0, maxSends]}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'var(--surface-elevated)', opacity: 0.5 }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.isSelected ? '#22c55e' : '#3b82f6'}
                      opacity={entry.count === 0 ? 0.3 : 1}
                      cursor={onDateClick ? 'pointer' : 'default'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 pt-3 border-t border-border"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Selected: {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                </span>
                <span className="font-semibold text-accent-success">
                  {chartData.find(d => d.fullDate === selectedDate)?.count || 0} sends
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

