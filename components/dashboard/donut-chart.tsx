'use client';

import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';

interface DonutChartProps {
  title: string;
  data: { name: string; value: number; color?: string }[];
  loading?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
}

const DEFAULT_COLORS = [
  CHART_COLORS.openai,
  CHART_COLORS.anthropic,
  CHART_COLORS.sends,
  CHART_COLORS.cost,
  CHART_COLORS.replies,
];

function CustomTooltip({ 
  active, 
  payload,
  formatter 
}: TooltipProps<number, string> & { formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const value = item.value as number;
  const formattedValue = formatter ? formatter(value) : formatCurrency(value);

  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-sm text-text-primary font-medium">{item.name}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary mt-1">{formattedValue}</p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-text-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  title,
  data,
  loading = false,
  className,
  valueFormatter = formatCurrency,
}: DonutChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className={cn('overflow-hidden h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={valueFormatter} />} />
                <Legend content={<CustomLegend />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center -mt-8">
                <p className="text-2xl font-bold text-text-primary">
                  {valueFormatter(total)}
                </p>
                <p className="text-xs text-text-secondary">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

