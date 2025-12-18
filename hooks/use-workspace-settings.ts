'use client';

/**
 * Workspace Settings Hook
 * 
 * SWR-based hook for loading and saving workspace settings
 */

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { useCallback } from 'react';

export interface WorkspaceSettings {
  timezone?: string;
  auto_refresh_seconds?: number;
  workspace_name?: string;
  date_format?: 'US' | 'EU';
  currency?: string;
}

interface SettingsResponse {
  settings: WorkspaceSettings;
}

export function useWorkspaceSettings() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data, error, isLoading, mutate } = useSWR<SettingsResponse>(
    workspaceId ? `/api/workspaces/settings?workspace_id=${workspaceId}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const updateSettings = useCallback(async (updates: Partial<WorkspaceSettings>) => {
    if (!workspaceId) {
      return { success: false, error: 'No workspace selected' };
    }

    // Optimistic update
    const previousData = data;
    if (data) {
      mutate({
        settings: { ...data.settings, ...updates },
      }, false);
    }

    try {
      const res = await fetch('/api/workspaces/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...updates,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Rollback on error
        if (previousData) mutate(previousData, false);
        return { success: false, error: json.error || 'Failed to update settings' };
      }

      // Refresh from server
      mutate();
      return { success: true, settings: json.settings };
    } catch (err) {
      // Rollback on error
      if (previousData) mutate(previousData, false);
      return { success: false, error: 'Network error' };
    }
  }, [workspaceId, data, mutate]);

  return {
    settings: data?.settings || {},
    isLoading,
    error,
    updateSettings,
    refresh: mutate,
  };
}
