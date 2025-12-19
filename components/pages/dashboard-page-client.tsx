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
import { CampaignCardStack } from '@/components/dashboard/campaign-card-stack';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { DateRangePickerMobile } from '@/components/dashboard/date-range-picker-mobile';
import { CampaignSelector } from '@/components/dashboard/campaign-selector';
import { AskAI } from '@/components/dashboard/ask-ai';
import { StepBreakdown } from '@/components/dashboard/step-breakdown';
import { DailySendsChart } from '@/components/dashboard/daily-sends-chart';
import { TimezoneSelector } from '@/components/dashboard/timezone-selector';
import { CampaignManagementTable } from '@/components/dashboard/campaign-management-table';
import { CampaignManagementCardStack } from '@/components/dashboard/campaign-management-card-stack';
import { MobileCollapsibleWidget } from '@/components/dashboard/mobile-collapsible-widget';
import { NewCampaignModal } from '@/components/campaigns/new-campaign-modal';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp } from 'lucide-react';

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
  const workspaceId = workspace?.id;
  
  // Load timezone from localStorage on mount
  useEffect(() => {
    const savedTz = localStorage.getItem('dashboard_timezone');
    if (workspace?.settings?.timezone && typeof workspace.settings.timezone === 'string') {
      setTimezone(workspace.settings.timezone);
      localStorage.setItem('dashboard_timezone', workspace.settings.timezone);
    } else if (savedTz) {
      setTimezone(savedTz);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" data-tour="metrics">
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
          <MobileCollapsibleWidget
            id="sends-optout"
            title="Sends & Opt-Out Trends"
            icon={<BarChart3 className="h-5 w-5" />}
            defaultCollapsed={true}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-4">
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
          </MobileCollapsibleWidget>
        );

      case 'click-reply':
        return (
          <MobileCollapsibleWidget
            id="click-reply"
            title="Click & Reply Trends"
            icon={<TrendingUp className="h-5 w-5" />}
            defaultCollapsed={true}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-4">
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
          </MobileCollapsibleWidget>
        );

      case 'campaign-stats':
        // Only render if there's actual campaign data
        if (!campaignStatsLoading && (!campaignStats || campaignStats.length === 0)) {
          return null;
        }
        return (
          <>
            {/* Desktop: Traditional table */}
            <div className="hidden md:block">
              <CampaignTable
                data={campaignStats}
                loading={campaignStatsLoading}
              />
            </div>
            {/* Mobile: Card stack */}
            <div className="block md:hidden">
              <CampaignCardStack
                data={campaignStats}
                loading={campaignStatsLoading}
              />
            </div>
          </>
        );

      case 'campaign-management':
        return (
          <div data-tour="campaigns">
            {/* Desktop: Traditional table with context menu */}
            <div className="hidden md:block">
              <CampaignManagementTable workspaceId={workspaceId} />
            </div>
            {/* Mobile: Card stack with dropdown menu */}
            <div className="block md:hidden">
              <CampaignManagementCardStack workspaceId={workspaceId} />
            </div>
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
          <p className="text-text-secondary text-sm mt-1 hidden sm:block">
            Track your cold email campaign performance
          </p>
        </div>
        
        {/* Filters: Stacked on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1.5">
          {/* Primary Filters Row */}
          <div className="flex items-center gap-2">
            {/* Timezone: Hidden on mobile to save space */}
            <div className="hidden sm:block">
              <TimezoneSelector
                selectedTimezone={timezone}
                onTimezoneChange={handleTimezoneChange}
              />
            </div>
            {/* Desktop: Popover picker */}
            <div className="hidden md:block">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateChange}
              />
            </div>
            {/* Mobile: Bottom sheet picker */}
            <div className="flex-1 md:hidden">
              <DateRangePickerMobile
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateChange}
              />
            </div>
            <div className="flex-1 sm:flex-initial">
              <CampaignSelector
                campaigns={campaigns}
                selectedCampaign={selectedCampaign}
                onCampaignChange={handleCampaignChange}
                loading={campaignsLoading}
              />
            </div>
          </div>
          
          <div className="h-5 w-px bg-slate-600 dark:bg-slate-400 mx-2 hidden sm:block" />

          {/* Actions - Hidden on mobile, shown in FAB instead */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsPanelOpen(true)}
              className="gap-1.5 h-8 px-3 text-xs"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Customize
            </Button>
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className="flex items-center gap-1.5 px-2.5 h-8 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors font-medium text-xs shadow-sm"
              data-tour="new-campaign"
            >
              <Plus className="h-3.5 w-3.5" />
              New Campaign
            </button>
          </div>
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
            {visibleWidgets.map(widget => {
              const content = renderWidget(widget.id);
              // Don't render DashboardWidget wrapper if content is null
              if (!content) return null;
              
              return (
                <DashboardWidget key={widget.id} id={widget.id}>
                  {content}
                </DashboardWidget>
              );
            })}
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
