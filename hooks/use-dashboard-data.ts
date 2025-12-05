'use client';

import { useMemo, useCallback } from 'react';
import { getProviderColor, getModelDisplayName } from '@/lib/constants';
import {
  useMetricsSummary,
  useTimeSeries,
  useCampaignStats,
  useCostBreakdown,
  useCampaigns,
  useStepBreakdown,
} from './use-metrics';
import type {
  DashboardParams,
  DashboardData,
  ChartDataPoint,
} from '@/lib/dashboard-types';

/**
 * useDashboardData - Centralized hook for all dashboard data
 * 
 * This hook consolidates all metrics hooks and data transformations needed
 * for the dashboard pages. It provides:
 * - All raw API data with loading states
 * - Pre-computed chart data (costByProvider, costByModel)
 * - Derived metrics (costPerReply, costPerSend)
 * - Convenience flags (isLoading, hasError)
 * - Refresh function to revalidate all data
 * 
 * @param params - Dashboard parameters (startDate, endDate, selectedCampaign)
 * @returns DashboardData object with all metrics and derived data
 */
export function useDashboardData(params: DashboardParams): DashboardData {
  const { startDate, endDate, selectedCampaign, selectedProvider } = params;
  const campaign = selectedCampaign ?? undefined;
  const provider = selectedProvider ?? undefined;

  // ============================================
  // FETCH ALL DATA
  // ============================================

  // Summary metrics
  const { 
    summary, 
    isLoading: summaryLoading, 
    isError: summaryError,
    mutate: mutateSummary,
  } = useMetricsSummary(startDate, endDate, campaign);

  // Time series data
  const { data: sendsSeries, isLoading: sendsLoading } = 
    useTimeSeries('sends', startDate, endDate, campaign);
  
  const { data: repliesSeries, isLoading: repliesLoading } = 
    useTimeSeries('replies', startDate, endDate, campaign);
  
  const { data: replyRateSeries, isLoading: replyRateLoading } = 
    useTimeSeries('reply_rate', startDate, endDate, campaign);
  
  const { data: clickRateSeries, isLoading: clickRateLoading } = 
    useTimeSeries('click_rate', startDate, endDate, campaign);
  
  const { data: optOutRateSeries, isLoading: optOutRateLoading } = 
    useTimeSeries('opt_out_rate', startDate, endDate, campaign);

  // Cost breakdown (with provider filter)
  const { data: costData, isLoading: costLoading, mutate: mutateCost } = 
    useCostBreakdown(startDate, endDate, campaign, provider);

  // Step breakdown
  const { 
    steps, 
    dailySends, 
    totalSends, 
    isLoading: stepLoading,
    mutate: mutateSteps,
  } = useStepBreakdown(startDate, endDate, campaign);

  // Campaigns
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { campaigns: campaignStats, isLoading: campaignStatsLoading } = 
    useCampaignStats(startDate, endDate);

  // ============================================
  // DERIVED DATA (MEMOIZED)
  // ============================================

  // Transform cost by provider for donut chart
  const costByProvider = useMemo<ChartDataPoint[]>(() => {
    if (!costData?.by_provider) return [];
    return costData.by_provider.map(p => ({
      name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
      value: p.cost_usd,
      color: getProviderColor(p.provider),
    }));
  }, [costData]);

  // Transform cost by model for donut chart (top 5)
  const costByModel = useMemo<ChartDataPoint[]>(() => {
    if (!costData?.by_model) return [];
    return costData.by_model.slice(0, 5).map(m => ({
      name: getModelDisplayName(m.model),
      value: m.cost_usd,
    }));
  }, [costData]);

  // Calculate cost per reply
  const costPerReply = useMemo(() => {
    if (!summary || !costData) return 0;
    if (summary.replies === 0) return 0;
    return costData.total.cost_usd / summary.replies;
  }, [summary, costData]);

  // Calculate cost per send
  const costPerSend = useMemo(() => {
    if (!summary || !costData) return 0;
    if (summary.sends === 0) return 0;
    return costData.total.cost_usd / summary.sends;
  }, [summary, costData]);

  // Calculate monthly projection
  // Logic: (Total Cost So Far / Days Passed in Month) * Total Days in Current Month
  // Returns null if selected range is NOT the current month
  const monthlyProjection = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Parse selected date range
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    
    // Check if selected range overlaps with current month
    const isCurrentMonth = 
      rangeStart.getFullYear() === today.getFullYear() &&
      rangeStart.getMonth() === today.getMonth();
    
    if (!isCurrentMonth) {
      return null; // Will display "N/A" in UI
    }
    
    // Calculate days passed in month (at least 1)
    const daysPassed = Math.max(1, Math.ceil(
      (today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)
    ));
    
    const daysInMonth = endOfMonth.getDate();
    const totalCost = costData?.total.cost_usd ?? 0;
    
    return (totalCost / daysPassed) * daysInMonth;
  }, [startDate, endDate, costData]);

  // ============================================
  // CONVENIENCE FLAGS
  // ============================================

  const isLoading = useMemo(() => {
    return summaryLoading || costLoading || stepLoading || campaignsLoading;
  }, [summaryLoading, costLoading, stepLoading, campaignsLoading]);

  const hasError = useMemo(() => {
    return !!summaryError;
  }, [summaryError]);

  // ============================================
  // REFRESH FUNCTION
  // ============================================

  const refresh = useCallback(() => {
    mutateSummary();
    mutateSteps();
    mutateCost();
  }, [mutateSummary, mutateSteps, mutateCost]);

  // ============================================
  // RETURN CONSOLIDATED DATA
  // ============================================

  return {
    // Summary
    summary,
    summaryLoading,
    summaryError,

    // Time series
    sendsSeries,
    sendsLoading,
    repliesSeries,
    repliesLoading,
    replyRateSeries,
    replyRateLoading,
    clickRateSeries,
    clickRateLoading,
    optOutRateSeries,
    optOutRateLoading,

    // Cost
    costData,
    costLoading,
    costByProvider,
    costByModel,
    costPerReply,
    costPerSend,
    monthlyProjection,

    // Steps
    steps,
    dailySends,
    totalSends,
    stepLoading,

    // Campaigns
    campaigns,
    campaignsLoading,
    campaignStats,
    campaignStatsLoading,

    // Flags
    isLoading,
    hasError,

    // Actions
    refresh,
  };
}

// Re-export for convenience
export type { DashboardParams, DashboardData } from '@/lib/dashboard-types';

