'use client';

import { motion } from 'framer-motion';
import { cn, formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Send,
  MessageSquareReply,
  UserMinus,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  format?: 'number' | 'currency' | 'percent';
  icon?: 'sends' | 'replies' | 'opt-outs' | 'cost' | 'bounces';
  loading?: boolean;
  className?: string;
  delay?: number;
}

const iconMap = {
  'sends': Send,
  'replies': MessageSquareReply,
  'opt-outs': UserMinus,
  'cost': DollarSign,
  'bounces': AlertTriangle,
};

const iconColorMap = {
  'sends': 'text-accent-primary bg-accent-primary/10',
  'replies': 'text-accent-success bg-accent-success/10',
  'opt-outs': 'text-accent-danger bg-accent-danger/10',
  'cost': 'text-accent-purple bg-accent-purple/10',
  'bounces': 'text-accent-warning bg-accent-warning/10',
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  format = 'number',
  icon = 'sends',
  loading = false,
  className,
  delay = 0,
}: MetricCardProps) {
  const Icon = iconMap[icon];
  const iconColors = iconColorMap[icon];

  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      default:
        return formatNumber(value);
    }
  })();

  const isPositiveGood = icon === 'replies' || icon === 'sends';
  const trendIsPositive = change !== undefined && change > 0;
  const trendIsNegative = change !== undefined && change < 0;
  
  // For opt-outs and bounces, down is good
  const isGoodTrend = isPositiveGood ? trendIsPositive : trendIsNegative;
  const isBadTrend = isPositiveGood ? trendIsNegative : trendIsPositive;

  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
    >
      <Card className={cn(
        'relative overflow-hidden group hover:border-accent-primary/30 transition-all duration-300 h-full',
        className
      )}>
        {/* Gradient glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            
            <motion.p 
              className="text-3xl font-bold text-text-primary tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: delay * 0.1 + 0.2 }}
            >
              {formattedValue}
            </motion.p>

            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                {trendIsPositive && (
                  <TrendingUp className={cn(
                    'h-4 w-4',
                    isGoodTrend ? 'text-accent-success' : 'text-accent-danger'
                  )} />
                )}
                {trendIsNegative && (
                  <TrendingDown className={cn(
                    'h-4 w-4',
                    isBadTrend ? 'text-accent-danger' : 'text-accent-success'
                  )} />
                )}
                {change === 0 && (
                  <Minus className="h-4 w-4 text-text-secondary" />
                )}
                
                <span className={cn(
                  'text-sm font-medium',
                  change === 0 && 'text-text-secondary',
                  isGoodTrend && 'text-accent-success',
                  isBadTrend && 'text-accent-danger'
                )}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}{changeLabel || '%'}
                </span>
                
                <span className="text-xs text-text-secondary">vs prev</span>
              </div>
            )}
          </div>

          <div className={cn(
            'flex items-center justify-center h-12 w-12 rounded-xl',
            iconColors
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

