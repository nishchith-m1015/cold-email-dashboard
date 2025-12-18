'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Settings2 } from 'lucide-react';
import { toISODate, daysAgo } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/constants';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useWorkspace } from '@/lib/workspace-context';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { DashboardWidget } from '@/components/dashboard/dashboard-widget';
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel';

// Components
import { MetricCard } from '@/components/dashboard/metric-card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { CampaignTable } from '@/components/dashboard/campaign-table';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { AskAI } from '@/components/dashboard/ask-ai';
import { StepBreakdown } from '@/components/dashboard/step-breakdown';
import { DailySendsChart } from '@/components/dashboard/daily-sends-chart';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import { CampaignManagementTable } from '@/components/dashboard/campaign-management-table';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { Button } from '@/components/ui/button';

export default function DashboardPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read dates from URL params with fallbacks
  const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
  const endDate = searchParams.get('end') ?? toISODate(new Date());
  const selectedCampaign = searchParams.get('campaign') ?? undefined;
  
  // Local UI state (doesn't need URL persistence)
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // Dashboard layout customization
  const { visibleWidgets, reorderWidgets, widgets, toggleWidget, resetLayout } = useDashboardLayout();

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance
      },
    })
  );

  // Timezone state - default to Los Angeles, persist in localStorage
  const { workspace } = useWorkspace();
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [autoRefresh, setAutoRefresh] = useState<number>(30);
  const workspaceId = workspace?.id;
  
  // Load timezone from localStorage on mount
  useEffect(() => {
    const savedTz = localStorage.getItem('dashboard_timezone');
    const savedRefresh = localStorage.getItem('dashboard_auto_refresh');
    if (workspace?.settings?.timezone && typeof workspace.settings.timezone === 'string') {
      setTimezone(workspace.settings.timezone);
      localStorage.setItem('dashboard_timezone', workspace.settings.timezone);
    } else if (savedTz) {
      setTimezone(savedTz);
    }
    if (typeof workspace?.settings?.auto_refresh_seconds === 'number') {
      setAutoRefresh(Number(workspace.settings.auto_refresh_seconds));
      localStorage.setItem('dashboard_auto_refresh', String(workspace.settings.auto_refresh_seconds));
    } else if (savedRefresh) {
      const val = Number(savedRefresh);
      if (Number.isFinite(val)) setAutoRefresh(val);
    }
  }, [workspace?.settings]);
  
  // Save timezone to localStorage when changed
  const handleTimezoneChange = useCallback((tz: string) => {
    setTimezone(tz);
    localStorage.setItem('dashboard_timezone', tz);
    if (!workspaceId) return;
    fetch('/api/workspaces/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, timezone: tz }),
    }).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dashboard_auto_refresh' && e.newValue) {
        const val = Number(e.newValue);
        if (Number.isFinite(val)) setAutoRefresh(val);
      }
      if (e.key === 'dashboard_timezone' && e.newValue) {
        setTimezone(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // FETCH ALL DASHBOARD DATA (CENTRALIZED)
  const dashboardData = useDashboardData({
    startDate,
    endDate,
    selectedCampaign,
  });

  useEffect(() => {
    const intervalSeconds = autoRefresh;
    if (!intervalSeconds || intervalSeconds <= 0) return;
    const id = setInterval(() => {
      dashboardData.refresh();
    }, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, dashboardData]);

  const {
    summary,
    summaryLoading,
    isRefetching,
    sendsSeries,
    sendsLoading,
    replyRateSeries,
    replyRateLoading,
    clickRateSeries,
    clickRateLoading,
    steps,
    dailySends,
    totalSends,
    totalLeads,
    stepLoading,
    optOutRateSeries,
    optOutRateLoading,
    campaigns,
    campaignsLoading,
    campaignStats,
    campaignStatsLoading,
  } = dashboardData;

  const handleDateChange = useCallback((start: string, end: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('start', start);
    params.set('end', end);
    router.replace(`?${params.toString()}`, { scroll: false });
    setSelectedDate(undefined);
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = visibleWidgets.findIndex(w => w.id === active.id);
      const newIndex = visibleWidgets.findIndex(w => w.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderWidgets(oldIndex, newIndex);
      }
    }
  }, [visibleWidgets, reorderWidgets]);

  const dateRangeDisplay = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return format(start, 'MMMM d, yyyy');
    }
    
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [startDate, endDate]);

  // Render widget by ID
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'metrics':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-tour="metrics">
            <MetricCard
              title="Total Sends"
              value={summary?.sends ?? 0}
              change={summary?.sends_change_pct}
              icon="sends"
              loading={summaryLoading}
              isRefetching={isRefetching}
              delay={0}
            />
            <MetricCard
              title="Click Rate"
              value={summary?.click_rate_pct ?? 0}
              format="percent"
              icon="clicks"
              loading={summaryLoading}
              isRefetching={isRefetching}
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
              isRefetching={isRefetching}
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
              isRefetching={isRefetching}
              delay={3}
            />
            <MetricCard
              title="Total Cost"
              value={summary?.cost_usd ?? 0}
              format="currency"
              icon="cost"
              loading={summaryLoading}
              isRefetching={isRefetching}
              delay={4}
            />
          </div>
        );

      case 'step-breakdown':
        return (
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
        );

      case 'sends-optout':
        return (
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
            <TimeSeriesChart
              title="Opt-Out Rate Over Time"
              subtitle={dateRangeDisplay}
              data={optOutRateSeries}
              color={CHART_COLORS.optOuts}
              loading={optOutRateLoading}
              type="line"
              valueFormatter={(v) => `${v}%`}
              height={300}
              className="h-full"
            />
          </div>
        );

      case 'click-reply':
        return (
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
        );

      case 'campaign-stats':
        return (
          <CampaignTable
            data={campaignStats}
            loading={campaignStatsLoading}
          />
        );

      case 'campaign-management':
        return (
          <div data-tour="campaigns">
            <CampaignManagementTable workspaceId={workspaceId} />
          </div>
        );

      case 'ask-ai':
        return <AskAI />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsPanelOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Customize
          </Button>
          <button
            onClick={() => setShowNewCampaignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium"
            data-tour="new-campaign"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
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

      {/* Draggable Widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {visibleWidgets.map(widget => (
              <DashboardWidget key={widget.id} id={widget.id}>
                {renderWidget(widget.id)}
              </DashboardWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* New Campaign Modal */}
      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />

      {/* Dashboard Settings Panel */}
      <DashboardSettingsPanel
        open={settingsPanelOpen}
        onOpenChange={setSettingsPanelOpen}
        widgets={widgets}
        onToggleWidget={toggleWidget}
        onResetLayout={resetLayout}
      />
    </div>
  );
}
