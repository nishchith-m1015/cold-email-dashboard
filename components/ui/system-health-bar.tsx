/**
 * Phase 32 Pillar 1: System Health Bar Component
 * Real-Time Synchronization Fabric - Global Health Indicator
 * 
 * Displays real-time sync status with visual indicators.
 */

'use client';

import { useRealtimeHealth } from '@/lib/realtime-health';
import { cn } from '@/lib/utils';
import { Activity, WifiOff, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '@/lib/types/health-types';

interface SystemHealthBarProps {
  workspaceId: string;
  className?: string;
}

const STATUS_CONFIG: Record<SyncStatus, {
  label: string;
  color: string;
  icon: typeof Activity;
  pulse: boolean;
}> = {
  live: {
    label: 'Live',
    color: 'bg-green-500',
    icon: Activity,
    pulse: true,
  },
  syncing: {
    label: 'Syncing',
    color: 'bg-amber-500',
    icon: RefreshCw,
    pulse: false,
  },
  stale: {
    label: 'Connection Stale',
    color: 'bg-gray-500',
    icon: WifiOff,
    pulse: false,
  },
  error: {
    label: 'Error',
    color: 'bg-red-500',
    icon: WifiOff,
    pulse: false,
  },
};

export function SystemHealthBar({ workspaceId, className }: SystemHealthBarProps) {
  const { health, refresh, isLoading } = useRealtimeHealth(workspaceId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-md', className)}>
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-xs text-text-secondary">Connecting...</span>
      </div>
    );
  }

  const config = STATUS_CONFIG[health.status];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-md transition-all',
        className
      )}
    >
      <div className="relative flex items-center">
        <div 
          className={cn(
            'h-2 w-2 rounded-full',
            config.color,
            config.pulse && 'animate-pulse'
          )} 
        />
        {config.pulse && (
          <div 
            className={cn(
              'absolute h-2 w-2 rounded-full animate-ping',
              config.color,
              'opacity-75'
            )} 
          />
        )}
      </div>

      <Icon className={cn('h-3.5 w-3.5', health.status === 'syncing' && 'animate-spin')} />
      
      <span className="text-xs font-medium">{config.label}</span>

      {health.errorMessage && (
        <span className="text-xs text-red-400 italic truncate max-w-[200px]" title={health.errorMessage}>
          {health.errorMessage}
        </span>
      )}

      {!health.isConnected && (
        <button
          onClick={refresh}
          className="ml-2 text-xs text-accent-primary hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
