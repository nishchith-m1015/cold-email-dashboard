/**
 * Shared Dashboard Types
 * 
 * This file centralizes all TypeScript interfaces used across the dashboard.
 * These types represent the shape of data from API responses and internal state.
 */

// ============================================
// METRICS SUMMARY
// ============================================

export interface MetricsSummary {
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens?: number;
  clicks?: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  open_rate_pct?: number;
  click_rate_pct?: number;
  cost_usd: number;
  sends_change_pct: number;
  reply_rate_change_pp: number;
  opt_out_rate_change_pp: number;
  prev_sends: number;
  prev_reply_rate_pct: number;
  start_date: string;
  end_date: string;
}

// ============================================
// TIME SERIES
// ============================================

export interface TimeSeriesPoint {
  day: string;
  value: number;
}

export interface TimeSeriesData {
  metric: string;
  points: TimeSeriesPoint[];
  start_date: string;
  end_date: string;
}

export type TimeSeriesMetric = 
  | 'sends' 
  | 'replies' 
  | 'opt_outs' 
  | 'reply_rate' 
  | 'opt_out_rate'
  | 'open_rate'
  | 'click_rate';

// ============================================
// CAMPAIGNS
// ============================================

export interface Campaign {
  name: string;
}

export interface CampaignList {
  campaigns: Campaign[];
}

export interface CampaignStats {
  campaign: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  cost_usd: number;
  cost_per_reply: number;
}

export interface CampaignData {
  campaigns: CampaignStats[];
  start_date: string;
  end_date: string;
}

// ============================================
// COST BREAKDOWN
// ============================================

export interface ProviderCost {
  provider: string;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  calls: number;
}

export interface ModelCost {
  model: string;
  provider: string;
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  calls: number;
}

export interface CostBreakdown {
  total: {
    cost_usd: number;
    tokens_in: number;
    tokens_out: number;
    calls: number;
  };
  by_provider: ProviderCost[];
  by_model: ModelCost[];
  daily: TimeSeriesPoint[];
  start_date: string;
  end_date: string;
}

// ============================================
// STEP BREAKDOWN
// ============================================

export interface StepBreakdown {
  step: number;
  name: string;
  sends: number;
  lastSentAt?: string;
}

export interface DailySend {
  date: string;
  count: number;
}

export interface StepBreakdownData {
  steps: StepBreakdown[];
  dailySends: DailySend[];
  totalSends: number;
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
}

// ============================================
// GOOGLE SHEETS
// ============================================

export interface GoogleSheetsStats {
  success: boolean;
  stats: {
    totalContacts: number;
    email1Sends: number;
    email2Sends: number;
    email3Sends: number;
    totalSends: number;
    uniqueContactsSent: number;
    replies: number;
    optOuts: number;
    replyRate: number;
    optOutRate: number;
    campaignName: string;
  };
  headers: string[];
}

// ============================================
// CHART DATA (Transformed for UI)
// ============================================

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

// ============================================
// DASHBOARD DATA (Consolidated)
// ============================================

export interface DashboardParams {
  startDate: string;
  endDate: string;
  selectedCampaign?: string | null;
  selectedProvider?: string | null; // Provider filter for cost analytics
  workspaceId?: string; // Workspace filter (multi-tenant)
}

export interface DashboardData {
  // Summary metrics
  summary: MetricsSummary | undefined;
  summaryLoading: boolean;
  summaryError: unknown;

  // Time series
  sendsSeries: TimeSeriesPoint[];
  sendsLoading: boolean;
  repliesSeries: TimeSeriesPoint[];
  repliesLoading: boolean;
  replyRateSeries: TimeSeriesPoint[];
  replyRateLoading: boolean;
  clickRateSeries: TimeSeriesPoint[];
  clickRateLoading: boolean;
  optOutRateSeries: TimeSeriesPoint[];
  optOutRateLoading: boolean;

  // Cost data
  costData: CostBreakdown | undefined;
  costLoading: boolean;
  costByProvider: ChartDataPoint[];
  costByModel: ChartDataPoint[];
  costPerReply: number;
  costPerSend: number;
  monthlyProjection: number | null; // null if not current month

  // Step breakdown
  steps: StepBreakdown[];
  dailySends: DailySend[];
  totalSends: number;
  stepLoading: boolean;

  // Campaigns
  campaigns: Campaign[];
  campaignsLoading: boolean;
  campaignStats: CampaignStats[];
  campaignStatsLoading: boolean;

  // Convenience flags
  isLoading: boolean;
  hasError: boolean;

  // Refresh functions
  refresh: () => void;
}

