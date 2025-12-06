'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toISODate, daysAgo } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';

// Components
import { MetricCard } from '@/components/dashboard/metric-card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { CampaignTable } from '@/components/dashboard/campaign-table';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { AskAI } from '@/components/dashboard/ask-ai';
import { StepBreakdown } from '@/components/dashboard/step-breakdown';
import { DailySendsChart } from '@/components/dashboard/daily-sends-chart';
import { EfficiencyMetrics } from '@/components/dashboard/efficiency-metrics';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';

export default function DashboardPage() {
  // ============================================
  // URL-BASED STATE (persists across navigation)
  // ============================================
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read dates from URL params with fallbacks
  const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
  const endDate = searchParams.get('end') ?? toISODate(new Date());
  const selectedCampaign = searchParams.get('campaign') ?? undefined;
  
  // Local UI state (doesn't need URL persistence)
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

  // ============================================
  // FETCH ALL DASHBOARD DATA (CENTRALIZED)
  // ============================================
  
  const dashboardData = useDashboardData({
    startDate,
    endDate,
    selectedCampaign,
  });

  // Destructure for cleaner access
  const {
    summary,
    summaryLoading,
    sendsSeries,
    sendsLoading,
    replyRateSeries,
    replyRateLoading,
    clickRateSeries,
    clickRateLoading,
    costPerReply,
    monthlyProjection,
    steps,
    dailySends,
    totalSends,
    uniqueContacts,
    totalLeads,
    stepLoading,
    campaigns,
    campaignsLoading,
    campaignStats,
    campaignStatsLoading,
  } = dashboardData;

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleDateChange = useCallback((start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('start', start);
    params.set('end', end);
    router.replace(`?${params.toString()}`, { scroll: false });
    setSelectedDate(undefined); // Clear selected date on range change
  }, [searchParams, router]);

  const handleCampaignChange = useCallback((campaign: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (campaign) {
      params.set('campaign', campaign);
    } else {
      params.delete('campaign');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? undefined : date);
  }, []);

  // ============================================
  // DERIVED UI VALUES
  // ============================================

  // Format date range for display
  const dateRangeDisplay = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return format(start, 'MMMM d, yyyy');
    }
    
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [startDate, endDate]);

  // ============================================
  // RENDER
  // ============================================

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
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            onCampaignChange={handleCampaignChange}
            loading={campaignsLoading}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Sends"
          value={summary?.sends ?? 0}
          change={summary?.sends_change_pct}
          icon="sends"
          loading={summaryLoading}
          delay={0}
        />
        <MetricCard
          title="Click Rate"
          value={summary?.click_rate_pct ?? 0}
          format="percent"
          icon="clicks"
          loading={summaryLoading}
          delay={1}
          tooltip="Percentage of emails where a link was clicked (95% accurate)"
        />
        <MetricCard
          title="Reply Rate"
          value={summary?.reply_rate_pct ?? 0}
          change={summary?.reply_rate_change_pp}
          changeLabel="pp"
          format="percent"
          icon="replies"
          loading={summaryLoading}
          delay={2}
        />
        <MetricCard
          title="Opt-Out Rate"
          value={summary?.opt_out_rate_pct ?? 0}
          change={summary?.opt_out_rate_change_pp}
          changeLabel="pp"
          format="percent"
          icon="opt-outs"
          loading={summaryLoading}
          delay={3}
        />
        <MetricCard
          title="Total Cost"
          value={summary?.cost_usd ?? 0}
          format="currency"
          icon="cost"
          loading={summaryLoading}
          delay={4}
        />
      </div>

      {/* Row 1: Sequence Breakdown & Daily Sends (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <StepBreakdown
          steps={steps}
          dailySends={dailySends}
          totalSends={totalSends}
          totalLeads={totalLeads}
          startDate={startDate}
          endDate={endDate}
          loading={stepLoading}
          className="h-full"
        />
        <DailySendsChart
          data={dailySends}
          startDate={startDate}
          endDate={endDate}
          loading={stepLoading}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
          className="h-full"
        />
      </div>

      {/* Row 2: Sends Trend & Efficiency (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TimeSeriesChart
          title="Email Sends Over Time"
          subtitle={dateRangeDisplay}
          data={sendsSeries}
          color={CHART_COLORS.sends}
          loading={sendsLoading}
          type="area"
          className="h-full"
        />
        <EfficiencyMetrics
          costPerReply={costPerReply}
          monthlyProjection={monthlyProjection}
          totalContacts={uniqueContacts} // Unique Email 1 recipients only
          loading={summaryLoading}
          className="h-full"
        />
      </div>

      {/* Row 3: Engagement Trends (Equal Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <TimeSeriesChart
          title="Click Rate Over Time"
          subtitle={dateRangeDisplay}
          data={clickRateSeries}
          color="#10b981"
          loading={clickRateLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={300}
          className="h-full"
        />
        <TimeSeriesChart
          title="Reply Rate Over Time"
          subtitle={dateRangeDisplay}
          data={replyRateSeries}
          color={CHART_COLORS.replies}
          loading={replyRateLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={300}
          className="h-full"
        />
      </div>

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
