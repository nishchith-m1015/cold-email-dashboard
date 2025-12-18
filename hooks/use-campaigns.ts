/**
 * useCampaigns Hook
 * 
 * Phase 31 Pillar 4: The Optimistic Interface
 * SWR-based hook for campaign management with optimistic toggle updates.
 */

'use client';

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import type { Campaign, N8nStatus, CampaignStatus } from '@/lib/dashboard-types';

// ============================================
// TYPES
// ============================================

interface CampaignWithN8n extends Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  n8n_status: N8nStatus;
  n8n_workflow_id?: string;
  version: number;
}

interface ToggleResult {
  success: boolean;
  campaign?: CampaignWithN8n;
  error?: string;
}

interface UseCampaignsResult {
  campaigns: CampaignWithN8n[];
  isLoading: boolean;
  error: Error | null;
  toggleCampaign: (id: string, action: 'activate' | 'deactivate') => Promise<ToggleResult>;
  updateCampaign: (id: string, updates: { name?: string; description?: string }) => Promise<{ success: boolean; error?: string }>;
  isToggling: (id: string) => boolean;
  refresh: () => void;
}

interface UseCampaignsOptions {
  workspaceId?: string;
  refreshInterval?: number;
}

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string): Promise<{ campaigns: CampaignWithN8n[] }> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch campaigns');
  }
  return res.json();
};

// ============================================
// HOOK
// ============================================

export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsResult {
  const { workspaceId, refreshInterval = 30000 } = options;
  
  // Track which campaigns are currently being toggled
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Build API URL
  const apiUrl = workspaceId 
    ? `/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`
    : '/api/campaigns';

  // SWR for campaign data
  // Disable auto-refresh while toggling to prevent glitches
  const { data, error, mutate, isLoading } = useSWR<{ campaigns: CampaignWithN8n[] }>(
    apiUrl,
    fetcher,
    {
      refreshInterval: togglingIds.size > 0 ? 0 : refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const campaigns = data?.campaigns ?? [];

  /**
   * Toggle a campaign's active state
   * Uses optimistic updates for instant UI feedback
   */
  const toggleCampaign = useCallback(async (
    id: string, 
    action: 'activate' | 'deactivate'
  ): Promise<ToggleResult> => {
    // Prevent double-toggling
    if (togglingIds.has(id)) {
      return { success: false, error: 'Toggle already in progress' };
    }

    // Mark as toggling
    setTogglingIds(prev => new Set(prev).add(id));

    // Find current campaign state for optimistic update
    const currentCampaign = campaigns.find(c => c.id === id);
    if (!currentCampaign) {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return { success: false, error: 'Campaign not found' };
    }

    // Optimistic update
    const optimisticStatus: CampaignStatus = action === 'activate' ? 'active' : 'paused';
    const optimisticN8nStatus: N8nStatus = action === 'activate' ? 'active' : 'inactive';
    
    const optimisticCampaigns = campaigns.map(c => 
      c.id === id 
        ? { ...c, status: optimisticStatus, n8n_status: optimisticN8nStatus }
        : c
    );

    // Apply optimistic update immediately (don't revalidate yet)
    mutate({ campaigns: optimisticCampaigns }, false);

    try {
      // Call the toggle API
      const response = await fetch(`/api/campaigns/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Rollback on error
        mutate(); // Revalidate from server
        return { 
          success: false, 
          error: result.error || 'Failed to toggle campaign' 
        };
      }

      // Success! Update with confirmed server state
      const confirmedCampaigns = campaigns.map(c => 
        c.id === id && result.campaign
          ? { ...c, ...result.campaign }
          : c
      );
      
      // Apply confirmed state (no revalidation needed - auto-refresh is disabled during toggle)
      mutate({ campaigns: confirmedCampaigns }, false);
      
      return { 
        success: true, 
        campaign: result.campaign 
      };
    } catch (err) {
      // Rollback on network error
      mutate(); // Revalidate from server
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Network error' 
      };
    } finally {
      // Clear toggling state
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [campaigns, mutate, togglingIds]);

  /**
   * Update a campaign (e.g. rename)
   * Uses optimistic updates
   */
  const updateCampaign = useCallback(async (
    id: string,
    updates: { name?: string; description?: string }
  ) => {
    // Find current campaign
    const currentCampaign = campaigns.find(c => c.id === id);
    if (!currentCampaign) return { success: false, error: 'Campaign not found' };

    // Optimistic update
    const optimisticCampaigns = campaigns.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    
    mutate({ campaigns: optimisticCampaigns }, false);

    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update');
      }

      // Success - update with server response
      const confirmedCampaigns = campaigns.map(c => 
        c.id === id ? { ...c, ...result.campaign } : c
      );
      mutate({ campaigns: confirmedCampaigns }, false);
      return { success: true };
    } catch (err) {
      // Rollback
      mutate();
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [campaigns, mutate]);

  /**
   * Check if a specific campaign is currently being toggled
   */
  const isToggling = useCallback((id: string): boolean => {
    return togglingIds.has(id);
  }, [togglingIds]);

  /**
   * Force refresh campaigns from server
   */
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return {
    campaigns,
    isLoading,
    error: error ?? null,
    toggleCampaign,
    updateCampaign,
    isToggling,
    refresh,
  };
}
