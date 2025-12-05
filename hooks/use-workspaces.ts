'use client';

import useSWR from 'swr';
import type { Workspace } from '@/lib/workspace-context';

// Fetcher with cache bypass
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

interface WorkspacesResponse {
  workspaces: Workspace[];
  current: Workspace | null;
}

/**
 * Hook to fetch user's workspaces from the API
 * Only fetches if userId is provided
 */
export function useUserWorkspaces(userId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<WorkspacesResponse>(
    userId ? `/api/workspaces?user_id=${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Dedupe for 1 minute
      errorRetryCount: 2,
    }
  );

  return {
    workspaces: data?.workspaces || [],
    currentWorkspace: data?.current || null,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to manage workspace invitations
 */
export function useWorkspaceInvitations(workspaceId: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceId ? `/api/workspaces/${workspaceId}/invitations` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    invitations: data?.invitations || [],
    isLoading,
    isError: error,
    mutate,
  };
}

