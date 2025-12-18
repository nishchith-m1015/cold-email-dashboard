/**
 * Phase 32 Pillar 5: Connection Health Sentinel Hook
 * Real-Time Synchronization Fabric - Multi-Service Health Monitoring
 * 
 * Monitors health of Supabase, n8n, and Clerk services.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@clerk/nextjs';
import type { ConnectionHealthState } from '@/lib/types/health-types';

const HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds

export function useConnectionHealth() {
  const { isLoaded, userId } = useAuth();
  const [health, setHealth] = useState<ConnectionHealthState>({
    supabase: 'connecting',
    n8n: 'checking',
    clerk: 'validating',
  });

  const checkSupabaseHealth = useCallback(async (): Promise<'ok' | 'error'> => {
    if (!supabaseBrowser) return 'error';
    
    try {
      const { error } = await supabaseBrowser.from('workspaces').select('id').limit(1);
      return error ? 'error' : 'ok';
    } catch {
      return 'error';
    }
  }, []);

  const checkN8nHealth = useCallback(async (): Promise<'ok' | 'unreachable'> => {
    try {
      const response = await fetch('/api/health/n8n', { method: 'HEAD' });
      return response.ok ? 'ok' : 'unreachable';
    } catch {
      return 'unreachable';
    }
  }, []);

  const checkClerkHealth = useCallback((): 'authenticated' | 'expired' | 'validating' => {
    if (!isLoaded) return 'validating';
    return userId ? 'authenticated' : 'expired';
  }, [isLoaded, userId]);

  const runHealthChecks = useCallback(async () => {
    const [supabase, n8n, clerk] = await Promise.all([
      checkSupabaseHealth(),
      checkN8nHealth(),
      checkClerkHealth(),
    ]);

    setHealth({ supabase, n8n, clerk });

    // Log warnings for degraded states
    if (supabase === 'error') {
      console.warn('[ConnectionHealth] Supabase connection error');
    }
    if (n8n === 'unreachable') {
      console.warn('[ConnectionHealth] n8n unreachable');
    }
  }, [checkSupabaseHealth, checkN8nHealth, checkClerkHealth]);

  useEffect(() => {
    runHealthChecks();
    const interval = setInterval(runHealthChecks, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runHealthChecks]);

  return health;
}
