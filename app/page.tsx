'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toISODate, daysAgo } from '@/lib/utils';
import { CHART_COLORS, getProviderColor } from '@/lib/constants';
import {
  useMetricsSummary,
  useTimeSeries,
  useCampaignStats,
  useCostBreakdown,
  useCampaigns,
  useStepBreakdown,
} from '@/hooks/use-metrics';

// Components
import { MetricCard } from '@/components/dashboard/metric-card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { CampaignTable } from '@/components/dashboard/campaign-table';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { AskAI } from '@/components/dashboard/ask-ai';
import { StepBreakdown } from '@/components/dashboard/step-breakdown';
import { DailySendsChart } from '@/components/dashboard/daily-sends-chart';
import { EfficiencyMetrics } from '@/components/dashboard/efficiency-metrics';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';

export default function DashboardPage() {
  // Date range state
  const [startDate, setStartDate] = useState(() => toISODate(daysAgo(30)));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  
  // Timezone state - default to Los Angeles, persist in localStorage
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  
  // Load timezone from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_timezone');
    if (saved) setTimezone(saved);
  }, []);
  
  // Save timezone to localStorage when changed
  const handleTimezoneChange = useCallback((tz: string) => {
    setTimezone(tz);
    localStorage.setItem('dashboard_timezone', tz);
  }, []);

  // Fetch data with memoized parameters to prevent unnecessary re-fetches
  const { summary, isLoading: summaryLoading } = useMetricsSummary(startDate, endDate, selectedCampaign);
  const { data: sendsData, isLoading: sendsLoading } = useTimeSeries('sends', startDate, endDate, selectedCampaign);
  const { data: replyRateData, isLoading: replyRateLoading } = useTimeSeries('reply_rate', startDate, endDate, selectedCampaign);
  const { campaigns: campaignList, isLoading: campaignsListLoading } = useCampaigns();
  const { campaigns: campaignStats, isLoading: campaignStatsLoading } = useCampaignStats(startDate, endDate);
  const { data: costData, isLoading: costLoading } = useCostBreakdown(startDate, endDate, selectedCampaign);
  const { steps, dailySends, totalSends, isLoading: stepLoading } = useStepBreakdown(startDate, endDate, selectedCampaign);

  // Prepare donut chart data - memoized to prevent recalculations
  const costByProvider = useMemo(() => {
    if (!costData?.by_provider) return [];
    return costData.by_provider.map(p => ({
      name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
      value: p.cost_usd,
      color: getProviderColor(p.provider),
    }));
  }, [costData]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleDateChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setSelectedDate(undefined); // Clear selected date on range change
  }, []);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? undefined : date);
  }, []);

  // Format date range for display
  const dateRangeDisplay = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return format(start, 'MMMM d, yyyy');
    }
    
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [startDate, endDate]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Track your cold email campaign performance
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <CampaignSelector
            campaigns={campaignList}
            selectedCampaign={selectedCampaign}
            onCampaignChange={setSelectedCampaign}
            loading={campaignsListLoading}
          />
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
          <TimezoneSelector
            selectedTimezone={timezone}
            onTimezoneChange={handleTimezoneChange}
          />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sends"
          value={summary?.sends ?? 0}
          change={summary?.sends_change_pct}
          icon="sends"
          loading={summaryLoading}
          delay={0}
        />
        <MetricCard
          title="Reply Rate"
          value={summary?.reply_rate_pct ?? 0}
          change={summary?.reply_rate_change_pp}
          changeLabel="pp"
          format="percent"
          icon="replies"
          loading={summaryLoading}
          delay={1}
        />
        <MetricCard
          title="Opt-Out Rate"
          value={summary?.opt_out_rate_pct ?? 0}
          change={summary?.opt_out_rate_change_pp}
          changeLabel="pp"
          format="percent"
          icon="opt-outs"
          loading={summaryLoading}
          delay={2}
        />
        <MetricCard
          title="LLM Cost"
          value={summary?.cost_usd ?? 0}
          format="currency"
          icon="cost"
          loading={summaryLoading}
          delay={3}
        />
      </div>

      {/* Sequence Breakdown & Daily Sends + Efficiency Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Sequence Breakdown (full height) */}
        <StepBreakdown
          steps={steps}
          dailySends={dailySends}
          totalSends={totalSends}
          startDate={startDate}
          endDate={endDate}
          loading={stepLoading}
        />
        
        {/* Right: Daily Sends (top) + Efficiency Metrics (bottom) */}
        <div className="flex flex-col gap-6">
          <DailySendsChart
            data={dailySends}
            startDate={startDate}
            endDate={endDate}
            loading={stepLoading}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
          />
          <EfficiencyMetrics
            costPerReply={summary?.replies ? summary.cost_usd / summary.replies : 0}
            monthlyProjection={(() => {
              // Calculate monthly projection based on current sending pace
              const daysInRange = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1);
              const dailyRate = totalSends / daysInRange;
              return dailyRate * 30 * (summary?.cost_usd && totalSends > 0 ? summary.cost_usd / totalSends : 0);
            })()}
            totalContacts={totalSends}
            loading={summaryLoading}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TimeSeriesChart
            title="Email Sends Over Time"
            subtitle={dateRangeDisplay}
            data={sendsData}
            color={CHART_COLORS.sends}
            loading={sendsLoading}
            type="area"
          />
        </div>
        <DonutChart
          title="Cost by Provider"
          data={costByProvider}
          loading={costLoading}
        />
      </div>

      {/* Reply Rate Chart */}
      <TimeSeriesChart
        title="Reply Rate Over Time"
        subtitle={dateRangeDisplay}
        data={replyRateData}
        color={CHART_COLORS.replies}
        loading={replyRateLoading}
        type="line"
        valueFormatter={(v) => `${v}%`}
        height={240}
      />

      {/* Campaign Table */}
      <CampaignTable
        data={campaignStats}
        loading={campaignStatsLoading}
      />

      {/* Ask AI */}
      <AskAI />
    </div>
  );
}
