/**
 * PHASE 34.5 - usePermissions Hook
 * 
 * Provides current user's permission state for the active workspace.
 * Use this hook to conditionally show/hide UI elements based on role.
 * 
 * Example usage:
 * ```
 * const { canManage, isOwner } = usePermissions();
 * if (!canManage) return null;
 * ```
 */

'use client';

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { WorkspaceRole } from '@/lib/workspace-access';

export interface PermissionsState {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canManageKeys: boolean;
  canDelete: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  role: WorkspaceRole | null;
  isLoading: boolean;
  error: Error | null;
}

interface AccessResponse {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canManageKeys: boolean;
  canDelete: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch permissions');
  return res.json();
});

export function usePermissions(): PermissionsState {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data, isLoading, error } = useSWR<AccessResponse>(
    workspaceId ? `/api/workspaces/${workspaceId}/access` : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5-minute cache
      revalidateOnFocus: false,
    }
  );

  if (!data) {
    return {
      canRead: false,
      canWrite: false,
      canManage: false,
      canManageKeys: false,
      canDelete: false,
      isOwner: false,
      isAdmin: false,
      role: null,
      isLoading,
      error: error || null,
    };
  }

  return {
    canRead: data.canRead,
    canWrite: data.canWrite,
    canManage: data.canManage,
    canManageKeys: data.canManageKeys,
    canDelete: data.canDelete,
    isOwner: data.role === 'owner',
    isAdmin: data.role === 'admin',
    role: data.role,
    isLoading,
    error: error || null,
  };
}
