'use client';

import useSWR from 'swr';

// ============================================
// TYPES
// ============================================

export interface BillingUsage {
  period: {
    month: string;
    start_date: string;
    end_date: string;
  };
  usage: {
    emails_sent: number;
    replies: number;
    opt_outs: number;
    llm_cost_usd: number;
    api_calls: number;
  };
  limits: {
    emails_limit: number | null;
    cost_limit: number | null;
    campaigns_limit: number | null;
    team_members_limit: number | null;
  };
  plan: {
    name: string;
    features: string[];
  };
}

export interface BillingHistoryItem {
  month: string;
  month_name: string;
  emails_sent: number;
  replies: number;
  llm_cost_usd: number;
  api_calls: number;
}

export interface BillingHistory {
  workspace_id: string;
  history: BillingHistoryItem[];
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch current month's billing usage
 */
export function useBillingUsage(workspaceId?: string, month?: string) {
  const params = new URLSearchParams();
  if (workspaceId) params.set('workspace_id', workspaceId);
  if (month) params.set('month', month);

  const { data, error, isLoading, mutate } = useSWR<BillingUsage>(
    `/api/billing/usage?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      refreshInterval: 300000, // 5 minutes
    }
  );

  return {
    usage: data,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch billing history
 */
export function useBillingHistory(workspaceId?: string, months?: number) {
  const params = new URLSearchParams();
  if (workspaceId) params.set('workspace_id', workspaceId);
  if (months) params.set('months', String(months));

  const { data, error, isLoading, mutate } = useSWR<BillingHistory>(
    `/api/billing/history?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000, // 5 minutes (history changes less frequently)
    }
  );

  return {
    history: data?.history || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if usage is approaching limits
 */
export function getUsageWarnings(usage: BillingUsage): string[] {
  const warnings: string[] = [];
  const { limits } = usage;

  if (limits.emails_limit) {
    const emailPercent = (usage.usage.emails_sent / limits.emails_limit) * 100;
    if (emailPercent >= 90) {
      warnings.push(`Email limit: ${Math.round(emailPercent)}% used (${usage.usage.emails_sent}/${limits.emails_limit})`);
    } else if (emailPercent >= 75) {
      warnings.push(`Email usage: ${Math.round(emailPercent)}% of monthly limit`);
    }
  }

  if (limits.cost_limit) {
    const costPercent = (usage.usage.llm_cost_usd / limits.cost_limit) * 100;
    if (costPercent >= 90) {
      warnings.push(`Cost limit: ${Math.round(costPercent)}% used ($${usage.usage.llm_cost_usd.toFixed(2)}/$${limits.cost_limit.toFixed(2)})`);
    } else if (costPercent >= 75) {
      warnings.push(`Cost usage: ${Math.round(costPercent)}% of monthly limit`);
    }
  }

  return warnings;
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(
  current: number,
  limit: number | null
): number | null {
  if (limit === null || limit === 0) return null;
  return Math.min(100, (current / limit) * 100);
}

