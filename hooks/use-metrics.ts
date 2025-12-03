'use client';

import useSWR, { SWRConfiguration } from 'swr';

// Optimized fetcher with abort controller support
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Shared SWR config for consistent caching behavior
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // Dedupe requests within 10 seconds
  errorRetryCount: 2,
  errorRetryInterval: 3000,
  keepPreviousData: true, // Keep showing old data while revalidating
};

export interface MetricsSummary {
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  cost_usd: number;
  sends_change_pct: number;
  reply_rate_change_pp: number;
  opt_out_rate_change_pp: number;
  prev_sends: number;
  prev_reply_rate_pct: number;
  start_date: string;
  end_date: string;
}

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

export interface Campaign {
  name: string;
}

export interface CampaignList {
  campaigns: Campaign[];
}

// Hook to fetch summary metrics
// Uses Google Sheets as primary source (source=sheets)
export function useMetricsSummary(start: string, end: string, campaign?: string) {
  const params = new URLSearchParams({ start, end, source: 'sheets' });
  if (campaign) params.set('campaign', campaign);
  
  const { data, error, isLoading, mutate } = useSWR<MetricsSummary>(
    `/api/metrics/summary?${params.toString()}`,
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    summary: data,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook to fetch time series data
export function useTimeSeries(
  metric: 'sends' | 'replies' | 'opt_outs' | 'reply_rate' | 'opt_out_rate',
  start: string,
  end: string,
  campaign?: string
) {
  const params = new URLSearchParams({ metric, start, end });
  if (campaign) params.set('campaign', campaign);

  const { data, error, isLoading } = useSWR<TimeSeriesData>(
    `/api/metrics/timeseries?${params.toString()}`,
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 60000,
    }
  );

  return {
    data: data?.points || [],
    isLoading,
    isError: error,
  };
}

// Hook to fetch campaign breakdown
// Uses Google Sheets as primary source (source=sheets)
export function useCampaignStats(start: string, end: string) {
  const params = new URLSearchParams({ start, end, source: 'sheets' });

  const { data, error, isLoading } = useSWR<CampaignData>(
    `/api/metrics/by-campaign?${params.toString()}`,
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 60000,
    }
  );

  return {
    campaigns: data?.campaigns || [],
    isLoading,
    isError: error,
  };
}

// Hook to fetch cost breakdown
export function useCostBreakdown(start: string, end: string, campaign?: string) {
  const params = new URLSearchParams({ start, end });
  if (campaign) params.set('campaign', campaign);

  const { data, error, isLoading } = useSWR<CostBreakdown>(
    `/api/metrics/cost-breakdown?${params.toString()}`,
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 60000,
    }
  );

  return {
    data,
    isLoading,
    isError: error,
  };
}

// Hook to fetch campaigns list
export function useCampaigns() {
  const { data, error, isLoading } = useSWR<CampaignList>(
    '/api/campaigns',
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 300000, // Refresh every 5 minutes
      dedupingInterval: 60000, // Dedupe for 1 minute (campaigns rarely change)
    }
  );

  return {
    campaigns: data?.campaigns || [],
    isLoading,
    isError: error,
  };
}

// Google Sheets specific stats
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

// Hook to fetch Google Sheets data directly
export function useGoogleSheetsStats() {
  const { data, error, isLoading, mutate } = useSWR<GoogleSheetsStats>(
    '/api/sheets?format=stats',
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 60000, // Refresh every minute
    }
  );

  return {
    stats: data?.stats,
    headers: data?.headers,
    isLoading,
    isError: error,
    mutate,
  };
}

// Step breakdown types
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

// Hook to fetch step-level breakdown
export function useStepBreakdown(start: string, end: string, campaign?: string) {
  const params = new URLSearchParams({ start, end, source: 'sheets' });
  if (campaign) params.set('campaign', campaign);

  const { data, error, isLoading, mutate } = useSWR<StepBreakdownData>(
    `/api/metrics/step-breakdown?${params.toString()}`,
    fetcher,
    { 
      refreshInterval: 60000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    data,
    steps: data?.steps || [],
    dailySends: data?.dailySends || [],
    totalSends: data?.totalSends || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

