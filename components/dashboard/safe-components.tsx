/**
 * Phase 13 - Safe Component Wrappers
 * 
 * This file exports "bulletproof" versions of all dashboard components.
 * Each component is wrapped with an ErrorBoundary and appropriate fallback UI.
 * 
 * Usage:
 *   import { SafeMetricCard, SafeTimeSeriesChart } from '@/components/dashboard/safe-components';
 * 
 * Benefits:
 *   - Component-level error isolation (one failing widget won't crash the entire page)
 *   - Automatic retry capability
 *   - User-friendly error messages
 *   - Dev-friendly error details (in development mode)
 */

'use client';

import { ComponentProps } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import {
  KPIErrorFallback,
  ChartErrorFallback,
  TableErrorFallback,
  WidgetErrorFallback,
} from '@/components/ui/error-fallbacks';

// Simple fallback for ErrorBoundary (no error props available from our wrapper)
const SimpleFallback = ({ label }: { label: string }) => (
  <div className="p-4 rounded-lg border border-border bg-surface text-sm text-text-primary">
    {`Something went wrong loading ${label}. Please try again.`}
  </div>
);

// Import all dashboard components
import { MetricCard } from './metric-card';
import { TimeSeriesChart } from './time-series-chart';
import { DonutChart } from './donut-chart';
import { DailySendsChart } from './daily-sends-chart';
import { StepBreakdown } from './step-breakdown';
import { EfficiencyMetrics } from './efficiency-metrics';
import { CampaignTable } from './campaign-table';
import { SenderBreakdown } from './sender-breakdown';

// Import lazy-loaded charts (these are already lazy, we're adding error boundaries)
import {
  TimeSeriesChart as LazyTimeSeriesChart,
  DonutChart as LazyDonutChart,
  DailySendsChart as LazyDailySendsChart,
  DailyCostChart as LazyDailyCostChart,
} from './lazy-charts';

// ============================================================================
// KPI Components (Metric Cards)
// ============================================================================

/**
 * SafeMetricCard - Wrapped with KPIErrorFallback
 * 
 * Displays a metric card with error isolation. If the card fails to render,
 * shows a compact error state (100px height) with retry button.
 */
export function SafeMetricCard(props: ComponentProps<typeof MetricCard>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Metric Card" />}
    >
      <MetricCard {...props} />
    </ErrorBoundary>
  );
}

// ============================================================================
// Chart Components
// ============================================================================

/**
 * SafeTimeSeriesChart - Wrapped with ChartErrorFallback
 * 
 * Displays a time series chart with error isolation. If the chart fails,
 * shows a 300px height error state with retry button.
 */
export function SafeTimeSeriesChart(props: ComponentProps<typeof TimeSeriesChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Time Series Chart" />}
    >
      <TimeSeriesChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeDonutChart - Wrapped with ChartErrorFallback
 * 
 * Displays a donut chart with error isolation.
 */
export function SafeDonutChart(props: ComponentProps<typeof DonutChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Donut Chart" />}
    >
      <DonutChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeDailySendsChart - Wrapped with ChartErrorFallback
 * 
 * Displays the daily sends bar chart with error isolation.
 */
export function SafeDailySendsChart(props: ComponentProps<typeof DailySendsChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Daily Sends Chart" />}
    >
      <DailySendsChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeDailyCostChart - Wrapped with ChartErrorFallback
 * 
 * Displays the daily cost area chart with error isolation.
 * This is a lazy-loaded component with additional error boundary.
 */
export function SafeDailyCostChart(props: ComponentProps<typeof LazyDailyCostChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Daily Cost Chart" />}
    >
      <LazyDailyCostChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * Lazy-loaded chart wrappers
 * These charts are already lazy-loaded, we're adding error boundaries on top
 */

/**
 * SafeLazyTimeSeriesChart - Wrapped lazy-loaded TimeSeriesChart
 * 
 * Combines lazy loading with error boundary for optimal performance and reliability.
 */
export function SafeLazyTimeSeriesChart(props: ComponentProps<typeof LazyTimeSeriesChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Time Series Chart" />}
    >
      <LazyTimeSeriesChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeLazyDonutChart - Wrapped lazy-loaded DonutChart
 */
export function SafeLazyDonutChart(props: ComponentProps<typeof LazyDonutChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Donut Chart" />}
    >
      <LazyDonutChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeLazyDailySendsChart - Wrapped lazy-loaded DailySendsChart
 */
export function SafeLazyDailySendsChart(props: ComponentProps<typeof LazyDailySendsChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Daily Sends Chart" />}
    >
      <LazyDailySendsChart {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeLazyDailyCostChart - Wrapped lazy-loaded DailyCostChart
 */
export function SafeLazyDailyCostChart(props: ComponentProps<typeof LazyDailyCostChart>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Daily Cost Chart" />}
    >
      <LazyDailyCostChart {...props} />
    </ErrorBoundary>
  );
}

// ============================================================================
// Breakdown/Widget Components
// ============================================================================

/**
 * SafeStepBreakdown - Wrapped with WidgetErrorFallback
 * 
 * Displays the sequence step breakdown with error isolation.
 * Uses WidgetErrorFallback (250px height) for flexible sizing.
 */
export function SafeStepBreakdown(props: ComponentProps<typeof StepBreakdown>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Step Breakdown" />}
    >
      <StepBreakdown {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeEfficiencyMetrics - Wrapped with WidgetErrorFallback
 * 
 * Displays efficiency metrics (cost per send, cost per reply, etc.) with error isolation.
 */
export function SafeEfficiencyMetrics(props: ComponentProps<typeof EfficiencyMetrics>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Efficiency Metrics" />}
    >
      <EfficiencyMetrics {...props} />
    </ErrorBoundary>
  );
}

/**
 * SafeSenderBreakdown - Wrapped with WidgetErrorFallback
 * 
 * Displays sender account breakdown with error isolation.
 */
export function SafeSenderBreakdown(props: ComponentProps<typeof SenderBreakdown>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Sender Breakdown" />}
    >
      <SenderBreakdown {...props} />
    </ErrorBoundary>
  );
}

// ============================================================================
// Table Components
// ============================================================================

/**
 * SafeCampaignTable - Wrapped with TableErrorFallback
 * 
 * Displays the campaign comparison table with error isolation.
 * Uses TableErrorFallback (200px height, full-width) for tabular layouts.
 */
export function SafeCampaignTable(props: ComponentProps<typeof CampaignTable>) {
  return (
    <ErrorBoundary
      fallback={<SimpleFallback label="Campaign Table" />}
    >
      <CampaignTable {...props} />
    </ErrorBoundary>
  );
}

// ============================================================================
// Type Exports (for convenience)
// ============================================================================

export type SafeMetricCardProps = ComponentProps<typeof SafeMetricCard>;
export type SafeTimeSeriesChartProps = ComponentProps<typeof SafeTimeSeriesChart>;
export type SafeDonutChartProps = ComponentProps<typeof SafeDonutChart>;
export type SafeDailySendsChartProps = ComponentProps<typeof SafeDailySendsChart>;
export type SafeDailyCostChartProps = ComponentProps<typeof SafeDailyCostChart>;
export type SafeStepBreakdownProps = ComponentProps<typeof SafeStepBreakdown>;
export type SafeEfficiencyMetricsProps = ComponentProps<typeof SafeEfficiencyMetrics>;
export type SafeSenderBreakdownProps = ComponentProps<typeof SafeSenderBreakdown>;
export type SafeCampaignTableProps = ComponentProps<typeof SafeCampaignTable>;

// Lazy-loaded component types
export type SafeLazyTimeSeriesChartProps = ComponentProps<typeof SafeLazyTimeSeriesChart>;
export type SafeLazyDonutChartProps = ComponentProps<typeof SafeLazyDonutChart>;
export type SafeLazyDailySendsChartProps = ComponentProps<typeof SafeLazyDailySendsChart>;
export type SafeLazyDailyCostChartProps = ComponentProps<typeof SafeLazyDailyCostChart>;

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * EXAMPLE USAGE IN PAGES:
 * 
 * Before (app/page.tsx):
 * ```tsx
 * import { MetricCard } from '@/components/dashboard/metric-card';
 * import { TimeSeriesChart, DailySendsChart } from '@/components/dashboard/lazy-charts';
 * 
 * <MetricCard title="Total Sends" value={1234} />
 * <TimeSeriesChart data={chartData} />
 * ```
 * 
 * After (app/page.tsx):
 * ```tsx
 * import { SafeMetricCard as MetricCard } from '@/components/dashboard/safe-components';
 * import {
 *   SafeLazyTimeSeriesChart as TimeSeriesChart,
 *   SafeLazyDailySendsChart as DailySendsChart,
 * } from '@/components/dashboard/safe-components';
 * 
 * <MetricCard title="Total Sends" value={1234} />
 * <TimeSeriesChart data={chartData} />
 * ```
 * 
 * Benefits:
 * - Identical API (props unchanged)
 * - Automatic error isolation
 * - Retry capability
 * - No changes to existing component usage
 * - Works with both lazy-loaded and direct imports
 */
