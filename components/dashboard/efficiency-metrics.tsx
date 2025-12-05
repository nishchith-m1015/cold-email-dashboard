'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';
import { DollarSign, Users, Target } from 'lucide-react';

interface EfficiencyMetricsProps {
  costPerReply: number;
  monthlyProjection: number | null;
  totalContacts: number;
  loading?: boolean;
  className?: string;
}

export function EfficiencyMetrics({
  costPerReply,
  monthlyProjection,
  totalContacts,
  loading = false,
  className,
}: EfficiencyMetricsProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      icon: DollarSign,
      label: 'Cost per Reply',
      value: formatCurrency(costPerReply),
      sublabel: 'Reply ROI',
      valueColor: 'text-accent-success',
    },
    {
      icon: Target,
      label: 'Monthly Projection',
      value: monthlyProjection !== null ? formatCurrency(monthlyProjection) : 'N/A',
      sublabel: monthlyProjection !== null ? 'Based on current pace' : 'Select current month',
      valueColor: 'text-accent-primary',
    },
    {
      icon: Users,
      label: 'Contacts Reached',
      value: totalContacts.toLocaleString(),
      sublabel: 'Total in sequence',
      valueColor: 'text-text-primary',
    },
  ];

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className={cn('overflow-hidden h-full flex flex-col', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Efficiency Metrics</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Horizontal 3-column layout like the reference */}
          <div className="grid grid-cols-3 gap-4 flex-1">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-border bg-surface-elevated/50 p-4 flex flex-col justify-center"
              >
                <p className="text-xs font-medium text-text-secondary mb-2">
                  {metric.label}
                </p>
                
                <p className={cn('text-2xl font-bold mb-1', metric.valueColor)}>
                  {metric.value}
                </p>
                
                <p className="text-xs text-text-secondary">
                  {metric.sublabel}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
