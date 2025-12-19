/**
 * CampaignCardStack - Mobile-friendly card view of campaign stats
 * 
 * Phase 38: Mobile Sovereignty - Pillar 1: The Card Metamorphosis
 * 
 * Replaces the 8-column CampaignTable on mobile with scannable,
 * tappable cards that display campaign performance at a glance.
 * 
 * Features:
 * - Vertical card stack layout
 * - Key metrics visible without scrolling
 * - Tap for expanded details (future)
 * - Loading skeleton state
 */

'use client';

import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  MessageSquare, 
  DollarSign,
  Users,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber, formatPercent, formatCurrency } from '@/lib/utils';
import type { CampaignStats } from '@/lib/dashboard-types';

interface CampaignCardStackProps {
  data: CampaignStats[];
  loading?: boolean;
  className?: string;
  onCardPress?: (campaign: CampaignStats) => void;
}

// Animation variants for staggered card entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 },
  },
};

function CampaignCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  );
}

interface MetricBadgeProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function MetricBadge({ label, value, icon, variant = 'default' }: MetricBadgeProps) {
  const variantStyles = {
    default: 'bg-surface-elevated border-border text-text-primary',
    success: 'bg-accent-success/10 border-accent-success/20 text-accent-success',
    warning: 'bg-accent-warning/10 border-accent-warning/20 text-accent-warning',
    danger: 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger',
  };

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg border',
      variantStyles[variant]
    )}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-text-secondary uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

export function CampaignCardStack({
  data,
  loading = false,
  className,
  onCardPress,
}: CampaignCardStackProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <div className="flex flex-col items-center gap-2">
          <Mail className="h-8 w-8 text-text-secondary" />
          <p className="text-text-secondary text-sm">No campaign data available</p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-3', className)}
    >
      {data.map((campaign, index) => {
        // Determine health indicators
        const isHighReplyRate = campaign.reply_rate_pct >= 5;
        const isHighOptOut = campaign.opt_out_rate_pct >= 2;
        const replyRateVariant = isHighReplyRate ? 'success' : 'default';
        const optOutVariant = isHighOptOut ? 'danger' : 'default';

        return (
          <motion.div
            key={campaign.campaign}
            variants={cardVariants}
          >
            <Card 
              className={cn(
                'p-4 transition-all cursor-pointer',
                'hover:border-accent-primary/30 active:scale-[0.98]',
                'border border-border'
              )}
              onClick={() => onCardPress?.(campaign)}
            >
              {/* Header Row: Campaign Name + Cost */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary truncate">
                    {campaign.campaign}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {formatNumber(campaign.contacts_reached || 0)} contacts reached
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className="flex-shrink-0 bg-accent-purple/10 text-accent-purple border-accent-purple/20"
                >
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  {formatCurrency(campaign.cost_usd)}
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                <MetricBadge
                  label="Sends"
                  value={formatNumber(campaign.sends)}
                  icon={<Mail className="h-4 w-4 text-accent-primary" />}
                />
                <MetricBadge
                  label="Replies"
                  value={`${formatNumber(campaign.replies)} (${formatPercent(campaign.reply_rate_pct)})`}
                  icon={isHighReplyRate 
                    ? <TrendingUp className="h-4 w-4" /> 
                    : <MessageSquare className="h-4 w-4" />
                  }
                  variant={replyRateVariant}
                />
                <MetricBadge
                  label="Opt-Outs"
                  value={`${formatNumber(campaign.opt_outs)} (${formatPercent(campaign.opt_out_rate_pct)})`}
                  icon={isHighOptOut 
                    ? <AlertTriangle className="h-4 w-4" /> 
                    : <XCircle className="h-4 w-4" />
                  }
                  variant={optOutVariant}
                />
                <MetricBadge
                  label="Cost/Reply"
                  value={campaign.cost_per_reply > 0 ? formatCurrency(campaign.cost_per_reply) : 'N/A'}
                  icon={<DollarSign className="h-4 w-4 text-text-secondary" />}
                />
              </div>

              {/* Performance Indicator Bar */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                  <span>Reply Rate</span>
                  <span className={cn(
                    isHighReplyRate ? 'text-accent-success' : 'text-text-primary'
                  )}>
                    {formatPercent(campaign.reply_rate_pct)}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      isHighReplyRate ? 'bg-accent-success' : 'bg-accent-primary'
                    )}
                    style={{ width: `${Math.min(campaign.reply_rate_pct * 10, 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
