/**
 * Notification Utilities
 * 
 * Helper functions for notification formatting and display
 */

import { 
  MessageSquare, 
  UserMinus, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  LucideIcon 
} from 'lucide-react';

export type NotificationType = 'reply' | 'opt_out' | 'budget_alert' | 'campaign_complete' | 'system';

interface NotificationStyle {
  icon: LucideIcon;
  color: string;
}

const NOTIFICATION_STYLES: Record<NotificationType, NotificationStyle> = {
  reply: {
    icon: MessageSquare,
    color: 'text-blue-500',
  },
  opt_out: {
    icon: UserMinus,
    color: 'text-orange-500',
  },
  budget_alert: {
    icon: AlertTriangle,
    color: 'text-red-500',
  },
  campaign_complete: {
    icon: CheckCircle,
    color: 'text-green-500',
  },
  system: {
    icon: Info,
    color: 'text-gray-500',
  },
};

/**
 * Get icon component for a notification type
 */
export function getNotificationIcon(type: NotificationType): LucideIcon {
  return NOTIFICATION_STYLES[type]?.icon || Info;
}

/**
 * Get color class for a notification type
 */
export function getNotificationColor(type: NotificationType): string {
  return NOTIFICATION_STYLES[type]?.color || 'text-gray-500';
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Get notification style (icon and color)
 */
export function getNotificationStyle(type: NotificationType): NotificationStyle {
  return NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.system;
}
