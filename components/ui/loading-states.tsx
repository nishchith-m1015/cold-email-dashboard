'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Page-level loading spinner
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <Loader2 className="h-8 w-8 text-accent-primary animate-spin" />
        <p className="text-sm text-text-secondary">Loading...</p>
      </motion.div>
    </div>
  );
}

/**
 * Card skeleton for metric cards
 */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border p-6 animate-pulse',
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="h-4 w-24 bg-surface-elevated rounded" />
        <div className="h-8 w-8 bg-surface-elevated rounded-lg" />
      </div>
      <div className="h-8 w-20 bg-surface-elevated rounded mb-2" />
      <div className="h-3 w-16 bg-surface-elevated rounded" />
    </div>
  );
}

/**
 * Chart skeleton
 */
export function ChartSkeleton({ className, height = 300 }: { className?: string; height?: number }) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border p-6 animate-pulse',
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-32 bg-surface-elevated rounded" />
        <div className="h-4 w-20 bg-surface-elevated rounded" />
      </div>
      <div 
        className="bg-surface-elevated rounded-lg"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn(
      'bg-surface rounded-xl border border-border p-6 animate-pulse',
      className
    )}>
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-4 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-surface-elevated rounded"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div 
              key={colIdx} 
              className="h-4 bg-surface-elevated rounded"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton - full page loading state
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-surface-elevated rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-surface-elevated rounded animate-pulse" />
          <div className="h-10 w-32 bg-surface-elevated rounded animate-pulse" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={280} />
        <ChartSkeleton height={280} />
      </div>
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineLoader({ 
  size = 'sm',
  className 
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Loader2 className={cn(
      'animate-spin text-accent-primary',
      sizes[size],
      className
    )} />
  );
}

/**
 * Data loading overlay (for refreshing existing data)
 */
export function DataRefreshOverlay({ isRefreshing }: { isRefreshing: boolean }) {
  if (!isRefreshing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl z-10"
    >
      <InlineLoader size="md" />
    </motion.div>
  );
}

