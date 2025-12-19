'use client';

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { useToast } from '@/hooks/use-toast';

interface ConfigValue {
  key: string;
  value: string | number | boolean | object;
  rawValue: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  isSensitive: boolean;
  updatedAt: string;
}

interface ConfigResponse {
  configs: ConfigValue[];
}

interface UseWorkspaceConfigReturn {
  configs: ConfigValue[];
  isLoading: boolean;
  error: Error | null;
  getConfig: (key: string) => ConfigValue | undefined;
  getValue: <T = string | number | boolean>(key: string) => T | undefined;
  updateConfig: (key: string, value: string | number | boolean) => Promise<boolean>;
  updateConfigs: (updates: Array<{ key: string; value: string | number | boolean }>) => Promise<boolean>;
  refresh: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

/**
 * useWorkspaceConfig - SWR hook for workspace configuration management
 * 
 * Provides read access to all users, write access to owners only.
 * Includes optimistic updates for smooth UX.
 */
export function useWorkspaceConfig(): UseWorkspaceConfigReturn {
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const workspaceId = workspace?.id;

  const { data, error, isLoading, mutate } = useSWR<ConfigResponse>(
    workspaceId ? `/api/workspaces/config?workspace_id=${workspaceId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Cache for 30 seconds
    }
  );

  const configs = data?.configs || [];

  const getConfig = (key: string): ConfigValue | undefined => {
    return configs.find(cfg => cfg.key === key);
  };

  const getValue = <T = string | number | boolean>(key: string): T | undefined => {
    const cfg = getConfig(key);
    return cfg?.value as T | undefined;
  };

  const updateConfig = async (key: string, value: string | number | boolean): Promise<boolean> => {
    return updateConfigs([{ key, value }]);
  };

  const updateConfigs = async (
    updates: Array<{ key: string; value: string | number | boolean }>
  ): Promise<boolean> => {
    if (!workspaceId) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      });
      return false;
    }

    // Optimistic update
    const previousConfigs = configs;
    const optimisticConfigs = configs.map(cfg => {
      const update = updates.find(u => u.key === cfg.key);
      if (update) {
        return {
          ...cfg,
          value: update.value,
          rawValue: String(update.value),
          updatedAt: new Date().toISOString(),
        };
      }
      return cfg;
    });

    mutate({ configs: optimisticConfigs }, false);

    try {
      const response = await fetch('/api/workspaces/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          updates,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Rollback on error
        mutate({ configs: previousConfigs }, false);
        
        const errorMsg = result.error || 'Failed to update configuration';
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Success',
        description: 'Configuration updated',
      });

      // Revalidate to get fresh data
      mutate();
      return true;

    } catch (err) {
      // Rollback on exception
      mutate({ configs: previousConfigs }, false);
      
      toast({
        title: 'Error',
        description: 'Failed to update configuration',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    configs,
    isLoading,
    error: error || null,
    getConfig,
    getValue,
    updateConfig,
    updateConfigs,
    refresh: () => mutate(),
  };
}
