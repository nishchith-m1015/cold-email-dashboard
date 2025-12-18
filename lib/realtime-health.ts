/**
 * Phase 32 Pillar 1: useRealtimeHealth Hook
 * Real-Time Synchronization Fabric - Global Health Indicator
 * 
 * Subscribes to sync_status table changes via Supabase Realtime.
 * Provides live health monitoring with automatic retry and stale detection.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { 
  SyncStatusRecord, 
  RealtimeHealthState, 
  ConnectionHealthState,
  UseRealtimeHealthReturn 
} from '@/lib/types/health-types';

const HEARTBEAT_STALE_THRESHOLD_MS = 60000; // 60 seconds
const MAX_RETRY_COUNT = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

export function useRealtimeHealth(workspaceId: string): UseRealtimeHealthReturn {
  const [health, setHealth] = useState<RealtimeHealthState>({
    status: 'syncing',
    workflowId: null,
    lastHeartbeat: null,
    errorMessage: null,
    isConnected: false,
    retryCount: 0,
  });

  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealthState>({
    supabase: 'connecting',
    n8n: 'checking',
    clerk: 'validating',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Check if heartbeat is stale
  const isHeartbeatStale = useCallback((lastHeartbeat: string): boolean => {
    const heartbeatDate = new Date(lastHeartbeat);
    const now = new Date();
    return (now.getTime() - heartbeatDate.getTime()) > HEARTBEAT_STALE_THRESHOLD_MS;
  }, []);

  // Retry with exponential backoff
  const attemptRetry = useCallback(() => {
    setHealth(prev => {
      const newRetryCount = prev.retryCount + 1;
      
      if (newRetryCount > MAX_RETRY_COUNT) {
        console.error('[RealtimeHealth] Max retries exceeded, falling back to polling');
        setConnectionHealth(p => ({ ...p, supabase: 'error' }));
        return { ...prev, isConnected: false };
      }

      const delay = RETRY_DELAYS[newRetryCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      console.log(`[RealtimeHealth] Retrying in ${delay}ms (attempt ${newRetryCount})`);
      
      retryTimeoutRef.current = setTimeout(() => {
        subscribe();
      }, delay);

      return { ...prev, retryCount: newRetryCount };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to Realtime channel
  const subscribe = useCallback(() => {
    if (!supabaseBrowser) {
      setError(new Error('Supabase client not initialized'));
      setConnectionHealth(prev => ({ ...prev, supabase: 'error' }));
      setIsLoading(false);
      return;
    }

    // Cleanup existing channel
    if (channelRef.current) {
      supabaseBrowser.removeChannel(channelRef.current);
    }

    const channel = supabaseBrowser
      .channel(`sync_status:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_status',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[RealtimeHealth] Received update:', payload);
          
          if (payload.new) {
            const record = payload.new as SyncStatusRecord;
            
            // Ignore stale events (version check)
            if (health.workflowId === record.workflow_id && record.version <= (health.version || 0)) {
              console.log('[RealtimeHealth] Ignoring stale event');
              return;
            }

            const isStale = isHeartbeatStale(record.last_heartbeat);
            
            setHealth({
              status: isStale ? 'stale' : record.status,
              workflowId: record.workflow_id,
              lastHeartbeat: new Date(record.last_heartbeat),
              errorMessage: record.error_message || null,
              isConnected: true,
              retryCount: 0,
              version: record.version,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeHealth] Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionHealth(prev => ({ ...prev, supabase: 'ok' }));
          setHealth(prev => ({ ...prev, isConnected: true }));
          setIsLoading(false);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionHealth(prev => ({ ...prev, supabase: 'error' }));
          attemptRetry();
        }
      });

    channelRef.current = channel;
  }, [workspaceId, health.workflowId, health.version, isHeartbeatStale, attemptRetry]);

  // Initial subscription
  useEffect(() => {
    subscribe();

    return () => {
      if (channelRef.current) {
        supabaseBrowser?.removeChannel(channelRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [subscribe]);

  // Pause/resume subscription on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[RealtimeHealth] Tab inactive, pausing subscription');
        if (channelRef.current) {
          supabaseBrowser?.removeChannel(channelRef.current);
        }
      } else {
        console.log('[RealtimeHealth] Tab active, resuming subscription');
        subscribe();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [subscribe]);

  const refresh = useCallback(() => {
    subscribe();
  }, [subscribe]);

  return {
    health,
    connectionHealth,
    refresh,
    isLoading,
    error,
  };
}
