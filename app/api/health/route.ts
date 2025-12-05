import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cacheManager } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    supabase: {
      status: 'ok' | 'error';
      latencyMs?: number;
      error?: string;
    };
    cache: {
      status: 'ok';
      totalEntries: number;
      freshEntries: number;
      staleEntries: number;
      inFlightRequests: number;
      hitRate?: string;
    };
  };
}

const startTime = Date.now();

// Track cache hits/misses for hit rate calculation
let cacheHits = 0;
let cacheMisses = 0;

export function recordCacheHit() { cacheHits++; }
export function recordCacheMiss() { cacheMisses++; }

export async function GET() {
  const checks: HealthStatus['checks'] = {
    supabase: { status: 'ok' },
    cache: { 
      status: 'ok', 
      totalEntries: 0, 
      freshEntries: 0, 
      staleEntries: 0,
      inFlightRequests: 0,
    },
  };

  let overallStatus: HealthStatus['status'] = 'healthy';

  // Check Supabase connection
  if (supabaseAdmin) {
    const startQuery = Date.now();
    try {
      const { error } = await supabaseAdmin
        .from('email_events')
        .select('id')
        .limit(1);

      checks.supabase.latencyMs = Date.now() - startQuery;

      if (error) {
        checks.supabase.status = 'error';
        checks.supabase.error = error.message;
        overallStatus = 'degraded';
      }
    } catch (err) {
      checks.supabase.status = 'error';
      checks.supabase.error = err instanceof Error ? err.message : 'Unknown error';
      overallStatus = 'degraded';
    }
  } else {
    checks.supabase.status = 'error';
    checks.supabase.error = 'Supabase not configured';
    overallStatus = 'degraded';
  }

  // Check cache with detailed stats
  try {
    const cacheStats = cacheManager.stats();
    checks.cache.totalEntries = cacheStats.totalEntries;
    checks.cache.freshEntries = cacheStats.validEntries;
    checks.cache.staleEntries = cacheStats.staleEntries;
    checks.cache.inFlightRequests = cacheStats.inFlightRequests;
    
    // Calculate hit rate
    const totalRequests = cacheHits + cacheMisses;
    if (totalRequests > 0) {
      checks.cache.hitRate = `${((cacheHits / totalRequests) * 100).toFixed(1)}%`;
    }
  } catch {
    // Cache error is not critical
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

