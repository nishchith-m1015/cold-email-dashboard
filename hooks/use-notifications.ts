'use client';

/**
 * Notifications Hook
 * 
 * SWR-based hook for managing workspace notifications with real-time polling
 */

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { NotificationType } from '@/lib/notification-utils';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
  related_campaign?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

export function useNotifications() {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    workspaceId ? `/api/notifications?workspace_id=${workspaceId}` : null,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const markAsRead = async (notificationIds: string[] | 'all') => {
    if (!workspaceId) return { success: false, error: 'No workspace selected' };

    // Optimistic update
    const previousData = data;
    if (data && notificationIds !== 'all') {
      const updatedNotifications = data.notifications.map(n =>
        notificationIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
      );
      mutate({
        notifications: updatedNotifications,
        unread_count: updatedNotifications.filter(n => !n.read_at).length,
      }, false);
    } else if (data && notificationIds === 'all') {
      const updatedNotifications = data.notifications.map(n => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      }));
      mutate({
        notifications: updatedNotifications,
        unread_count: 0,
      }, false);
    }

    try {
      const res = await fetch(`/api/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          notification_ids: notificationIds,
          action: 'read',
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Rollback on error
        if (previousData) mutate(previousData, false);
        return { success: false, error: json.error || 'Failed to mark as read' };
      }

      // Refresh from server
      mutate();
      return { success: true };
    } catch (err) {
      // Rollback on error
      if (previousData) mutate(previousData, false);
      return { success: false, error: 'Network error' };
    }
  };

  const dismiss = async (notificationId: string) => {
    if (!workspaceId) return { success: false, error: 'No workspace selected' };

    // Optimistic update - remove notification
    const previousData = data;
    if (data) {
      const updatedNotifications = data.notifications.filter(n => n.id !== notificationId);
      mutate({
        notifications: updatedNotifications,
        unread_count: updatedNotifications.filter(n => !n.read_at).length,
      }, false);
    }

    try {
      const res = await fetch(`/api/notifications?id=${notificationId}&workspace_id=${workspaceId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok) {
        // Rollback on error
        if (previousData) mutate(previousData, false);
        return { success: false, error: json.error || 'Failed to dismiss notification' };
      }

      // Refresh from server
      mutate();
      return { success: true };
    } catch (err) {
      // Rollback on error
      if (previousData) mutate(previousData, false);
      return { success: false, error: 'Network error' };
    }
  };

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unread_count || 0,
    isLoading,
    error,
    markAsRead,
    dismiss,
    refresh: mutate,
  };
}
