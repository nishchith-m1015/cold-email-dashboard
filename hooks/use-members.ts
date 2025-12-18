'use client';

/**
 * Members Hook
 * 
 * SWR-based hook for managing workspace members.
 */

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { WorkspaceRole } from '@/lib/workspace-access';

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: WorkspaceRole;
  isCurrentUser: boolean;
  isOrphan?: boolean;
}

interface MembersResponse {
  members: WorkspaceMember[];
  totalCount: number;
  currentUserRole: WorkspaceRole;
  canManage: boolean;
}

export function useMembers() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    workspaceId ? `/api/workspaces/${workspaceId}/members` : null
  );

  const updateRole = async (userId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return { success: false, error: 'No workspace selected' };

    // Optimistic update
    const previousData = data;
    if (data) {
      mutate({
        ...data,
        members: data.members.map(m => 
          m.userId === userId ? { ...m, role: newRole } : m
        ),
      }, false);
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Rollback on error
        if (previousData) mutate(previousData, false);
        return { success: false, error: json.error || 'Failed to update role' };
      }

      // Refresh to get latest data
      mutate();
      return { success: true };
    } catch (err) {
      // Rollback on error
      if (previousData) mutate(previousData, false);
      return { success: false, error: 'Network error' };
    }
  };

  const removeMember = async (userId: string) => {
    if (!workspaceId) return { success: false, error: 'No workspace selected' };

    // Optimistic update
    const previousData = data;
    if (data) {
      mutate({
        ...data,
        members: data.members.filter(m => m.userId !== userId),
        totalCount: data.totalCount - 1,
      }, false);
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members?userId=${userId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok) {
        // Rollback on error
        if (previousData) mutate(previousData, false);
        return { success: false, error: json.error || 'Failed to remove member' };
      }

      // Refresh to get latest data
      mutate();
      return { success: true };
    } catch (err) {
      // Rollback on error
      if (previousData) mutate(previousData, false);
      return { success: false, error: 'Network error' };
    }
  };

  return {
    members: data?.members || [],
    totalCount: data?.totalCount || 0,
    currentUserRole: data?.currentUserRole || null,
    canManage: data?.canManage || false,
    isLoading,
    error,
    updateRole,
    removeMember,
    refresh: mutate,
  };
}
