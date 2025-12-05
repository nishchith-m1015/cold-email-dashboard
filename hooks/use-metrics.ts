'use client';

import useSWR, { SWRConfiguration } from 'swr';

// Re-export types from shared types file for backwards compatibility
export type {
  MetricsSummary,
  TimeSeriesPoint,
  TimeSeriesData,
  TimeSeriesMetric,
  Campaign,
  CampaignList,
  CampaignStats,
  CampaignData,
  ProviderCost,
  ModelCost,
  CostBreakdown,
  StepBreakdown,
  DailySend,
  StepBreakdownData,
  GoogleSheetsStats,
  ChartDataPoint,
  DashboardParams,
  DashboardData,
} from '@/lib/dashboard-types';

import type {
  MetricsSummary,
  TimeSeriesData,
  TimeSeriesPoint,
  TimeSeriesMetric,
  CampaignData,
  CostBreakdown,
  CampaignList,
  StepBreakdownData,
  GoogleSheetsStats,
} from '@/lib/dashboard-types';

// Optimized fetcher that bypasses browser cache
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    cache: 'no-store', // Bypass browser cache - ensures fresh data
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
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
  metric: TimeSeriesMetric,
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
export function useCostBreakdown(start: string, end: string, campaign?: string, provider?: string) {
  const params = new URLSearchParams({ start, end });
  if (campaign) params.set('campaign', campaign);
  if (provider && provider !== 'all') params.set('provider', provider);

  const { data, error, isLoading, mutate } = useSWR<CostBreakdown>(
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
    mutate,
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
