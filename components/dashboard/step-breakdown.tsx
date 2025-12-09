'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber } from '@/lib/utils';
import { Mail, Clock, TrendingUp, Calendar } from 'lucide-react';
import type { StepBreakdown as StepBreakdownType, DailySend } from '@/hooks/use-metrics';

interface StepBreakdownProps {
  steps: StepBreakdownType[];
  dailySends: DailySend[];
  totalSends: number;
  totalLeads?: number; // Total leads for % calculation (e.g., 3500)
  startDate: string;
  endDate: string;
  loading?: boolean;
  className?: string;
}

const stepColors = [
  'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
  'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  'bg-accent-success/10 text-accent-success border-accent-success/20',
];

const stepBgColors = [
  'from-accent-primary/5 to-transparent',
  'from-accent-purple/5 to-transparent',
  'from-accent-success/5 to-transparent',
];

export function StepBreakdown({
  steps,
  dailySends,
  totalSends,
  totalLeads = 0,
  startDate,
  endDate,
  loading = false,
  className,
}: StepBreakdownProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return format(new Date(isoString), 'MMM d, h:mm a');
    } catch {
      return '—';
    }
  };

  // Calculate percentage for each step based on total leads (not total emails)
  // This shows what % of leads have received each email in the sequence
  const getPercentage = (sends: number) => {
    // Use totalLeads if available, otherwise fall back to totalSends
    const base = totalLeads > 0 ? totalLeads : totalSends;
    if (base === 0) return 0;
    return Number(((sends / base) * 100).toFixed(1));
  };

  // Get top 5 daily sends for quick view
  const topDays = [...dailySends]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent-primary" />
              Sequence Breakdown
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {formatNumber(totalSends)} total
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {formatDate(startDate)} — {formatDate(endDate)}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Step-by-Step Breakdown */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative rounded-lg border p-4 overflow-hidden',
                  stepColors[index]
                )}
              >
                {/* Background gradient */}
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-r opacity-50',
                  stepBgColors[index]
                )} />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex items-center justify-center h-8 w-8 rounded-lg',
                      index === 0 && 'bg-accent-primary/20',
                      index === 1 && 'bg-accent-purple/20',
                      index === 2 && 'bg-accent-success/20'
                    )}>
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary text-sm">
                        {step.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-text-secondary" />
                        <span className="text-xs text-text-secondary">
                          Last sent: {formatTime(step.lastSentAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xl font-bold text-text-primary">
                      {formatNumber(step.sends)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {getPercentage(step.sends)}% of {totalLeads > 0 ? 'leads' : 'total'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative mt-3 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full',
                      index === 0 && 'bg-accent-primary',
                      index === 1 && 'bg-accent-purple',
                      index === 2 && 'bg-accent-success'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${getPercentage(step.sends)}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Top Sending Days */}
          {topDays.length > 0 && topDays.some(d => d.count > 0) && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-text-secondary" />
                <h4 className="text-sm font-medium text-text-primary">Top Sending Days</h4>
              </div>
              <div className="space-y-2">
                {topDays.filter(d => d.count > 0).map((day, index) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">
                      {formatDate(day.date)}
                    </span>
                    <span className="font-medium text-text-primary">
                      {formatNumber(day.count)} sends
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

