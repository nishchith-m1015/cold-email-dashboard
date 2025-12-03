'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toISODate, daysAgo, formatCurrency, formatNumber } from '@/lib/utils';
import { CHART_COLORS, getProviderColor } from '@/lib/constants';
import {
  useMetricsSummary,
  useTimeSeries,
  useCostBreakdown,
  useCampaigns,
} from '@/hooks/use-metrics';

// Components
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { DonutChart } from '@/components/dashboard/donut-chart';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import { DailyCostChart } from '@/components/dashboard/daily-cost-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Cpu, 
  Zap, 
  TrendingUp, 
  DollarSign,
  BarChart3
} from 'lucide-react';

export default function AnalyticsPage() {
  // Date range state
  const [startDate, setStartDate] = useState(() => toISODate(daysAgo(30)));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>();
  
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

  // Fetch data
  const { summary, isLoading: summaryLoading } = useMetricsSummary(startDate, endDate, selectedCampaign);
  const { campaigns: campaignList, isLoading: campaignsListLoading } = useCampaigns();
  const { data: costData, isLoading: costLoading } = useCostBreakdown(startDate, endDate, selectedCampaign);
  const { data: optOutData, isLoading: optOutLoading } = useTimeSeries('opt_out_rate', startDate, endDate, selectedCampaign);
  const { data: replyData, isLoading: replyLoading } = useTimeSeries('reply_rate', startDate, endDate, selectedCampaign);

  // Prepare charts data
  const costByProvider = useMemo(() => {
    if (!costData?.by_provider) return [];
    return costData.by_provider.map(p => ({
      name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
      value: p.cost_usd,
      color: getProviderColor(p.provider),
    }));
  }, [costData]);

  const costByModel = useMemo(() => {
    if (!costData?.by_model) return [];
    return costData.by_model.slice(0, 5).map(m => ({
      name: m.model,
      value: m.cost_usd,
    }));
  }, [costData]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-accent-purple" />
            Analytics
          </h1>
          <div className="text-text-secondary text-sm mt-1">
            Deep dive into your campaign performance and costs
          </div>
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

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total LLM Cost"
          value={costData?.total.cost_usd ?? 0}
          format="currency"
          icon="cost"
          loading={costLoading}
          delay={0}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full">
            <div className="flex items-start justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Cost per Reply</p>
                <div className="text-3xl font-bold text-text-primary tracking-tight">
                  {summaryLoading || costLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(costPerReply)
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  Based on {summary?.replies ?? 0} replies
                </div>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent-success/10">
                <TrendingUp className="h-6 w-6 text-accent-success" />
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <div className="flex items-start justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Cost per Send</p>
                <div className="text-3xl font-bold text-text-primary tracking-tight">
                  {summaryLoading || costLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(costPerSend)
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  Based on {formatNumber(summary?.sends ?? 0)} sends
                </div>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent-primary/10">
                <DollarSign className="h-6 w-6 text-accent-primary" />
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="h-full">
            <div className="flex items-start justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-secondary">Total API Calls</p>
                <div className="text-3xl font-bold text-text-primary tracking-tight">
                  {costLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatNumber(costData?.total.calls ?? 0)
                  )}
                </div>
                <div className="text-xs text-text-secondary">
                  LLM requests made
                </div>
              </div>
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-accent-warning/10">
                <Zap className="h-6 w-6 text-accent-warning" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Cost Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChart
          title="Cost by Provider"
          data={costByProvider}
          loading={costLoading}
        />
        <DonutChart
          title="Cost by Model"
          data={costByModel}
          loading={costLoading}
        />
      </div>

      {/* Cost Timeseries */}
      <DailyCostChart
        data={costData?.daily || []}
        loading={costLoading}
        timezone={timezone}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          title="Reply Rate Trend"
          data={replyData}
          color={CHART_COLORS.replies}
          loading={replyLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={240}
        />
        <TimeSeriesChart
          title="Opt-Out Rate Trend"
          data={optOutData}
          color={CHART_COLORS.optOuts}
          loading={optOutLoading}
          type="line"
          valueFormatter={(v) => `${v}%`}
          height={240}
        />
      </div>

      {/* Model Usage Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent-purple" />
              Model Usage Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Model</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Provider</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Calls</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Tokens In</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Tokens Out</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {costData?.by_model.map((model, index) => (
                      <motion.tr
                        key={`${model.provider}-${model.model}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-surface-elevated/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">{model.model}</td>
                        <td className="px-4 py-3">
                          <Badge variant={model.provider === 'openai' ? 'success' : 'warning'}>
                            {model.provider}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-text-secondary">
                          {formatNumber(model.calls)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-text-secondary">
                          {formatNumber(model.tokens_in)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-text-secondary">
                          {formatNumber(model.tokens_out)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-accent-purple">
                          {formatCurrency(model.cost_usd)}
                        </td>
                      </motion.tr>
                    ))}
                    {(!costData?.by_model || costData.by_model.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-text-secondary">
                          No model usage data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
