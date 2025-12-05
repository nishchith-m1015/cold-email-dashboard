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
      entries: number;
    };
  };
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus['checks'] = {
    supabase: { status: 'ok' },
    cache: { status: 'ok', entries: 0 },
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

  // Check cache
  try {
    const cacheStats = cacheManager.stats();
    checks.cache.entries = cacheStats.totalEntries;
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

