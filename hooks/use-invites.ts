'use client';

/**
 * Invites Hook
 * 
 * SWR-based hook for managing workspace invite codes.
 */

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { WorkspaceRole } from '@/lib/workspace-access';

interface Invite {
  id: string;
  code: string;
  role: WorkspaceRole;
  usesRemaining: number | null;
  expiresAt: string | null;
  createdAt: string;
}

interface InvitesResponse {
  invites: Invite[];
}

interface CreateInviteOptions {
  role?: WorkspaceRole;
  uses?: number | null;
  expiresInDays?: number | null;
}

export function useInvites() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data, error, isLoading, mutate } = useSWR<InvitesResponse>(
    workspaceId ? `/api/workspaces/${workspaceId}/invites` : null
  );

  const createInvite = async (options: CreateInviteOptions = {}) => {
    if (!workspaceId) return { success: false, error: 'No workspace selected' };

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: options.role || 'member',
          uses: options.uses,
          expiresInDays: options.expiresInDays,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error || 'Failed to create invite' };
      }

      // Refresh invites list
      mutate();
      return { success: true, invite: json.invite };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!workspaceId) return { success: false, error: 'No workspace selected' };

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error || 'Failed to revoke invite' };
      }

      // Refresh invites list
      mutate();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  return {
    invites: data?.invites || [],
    isLoading,
    error,
    createInvite,
    revokeInvite,
    refresh: mutate,
  };
}
