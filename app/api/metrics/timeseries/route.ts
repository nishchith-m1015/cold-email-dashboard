import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getWorkspaceId } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { cacheManager, apiCacheKey, CACHE_TTL } from '@/lib/cache';
import { EXCLUDED_CAMPAIGNS } from '@/lib/db-queries';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

// Types
interface TimeseriesResponse {
  metric: string;
  points: Array<{ day: string; value: number }>;
  start_date: string;
  end_date: string;
  source?: string;
}

// Core data fetching (used by cache)
async function fetchTimeseriesData(
  metric: string,
  startDate: string,
  endDate: string,
  workspaceId: string,
  campaign?: string | null
): Promise<TimeseriesResponse> {
  if (!supabaseAdmin) {
    return {
      metric,
      points: fillMissingDays([], startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      source: 'fallback',
    };
  }

  // Build stats query
  let statsQuery = supabaseAdmin
    .from('daily_stats')
    .select('day, sends, replies, opt_outs, bounces')
    .eq('workspace_id', workspaceId)
    .gte('day', startDate)
    .lte('day', endDate)
    .order('day', { ascending: true });

  // Apply campaign filter OR global exclusion
  if (campaign) {
    statsQuery = statsQuery.eq('campaign_name', campaign);
  } else {
    // Exclude test campaigns globally
    for (const excludedCampaign of EXCLUDED_CAMPAIGNS) {
      statsQuery = statsQuery.neq('campaign_name', excludedCampaign);
    }
  }

  // Build click query if needed (parallel execution)
  const needsClickData = metric === 'click_rate' || metric === 'clicks';
  let clickQueryPromise: Promise<{ data: Array<{ created_at: string }> | null; error: Error | null }> | null = null;

  if (needsClickData && supabaseAdmin) {
    let clickQuery = supabaseAdmin
      .from('email_events')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'clicked')
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (campaign) {
      clickQuery = clickQuery.eq('campaign_name', campaign);
    } else {
      // Exclude test campaigns globally
      for (const excludedCampaign of EXCLUDED_CAMPAIGNS) {
        clickQuery = clickQuery.neq('campaign_name', excludedCampaign);
      }
    }
    // Execute the query - wrap in Promise.resolve to ensure proper Promise type
    clickQueryPromise = Promise.resolve(clickQuery).then(result => ({
      data: result.data as Array<{ created_at: string }> | null,
      error: result.error as Error | null,
    }));
  }

  // Execute queries in parallel
  const [statsResult, clickResult] = await Promise.all([
    statsQuery,
    clickQueryPromise || Promise.resolve({ data: null, error: null }),
  ]);

  if (statsResult.error) {
    console.error('Timeseries query error:', statsResult.error);
    return {
      metric,
      points: fillMissingDays([], startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      source: 'fallback',
    };
  }

  // Aggregate by day
  const dayMap = new Map<string, { sends: number; replies: number; opt_outs: number; bounces: number }>();

  for (const row of statsResult.data || []) {
    const existing = dayMap.get(row.day) || { sends: 0, replies: 0, opt_outs: 0, bounces: 0 };
    dayMap.set(row.day, {
      sends: existing.sends + (row.sends || 0),
      replies: existing.replies + (row.replies || 0),
      opt_outs: existing.opt_outs + (row.opt_outs || 0),
      bounces: existing.bounces + (row.bounces || 0),
    });
  }

  // Process click data
  const clicksByDay = new Map<string, number>();
  if (clickResult.data && !clickResult.error) {
    for (const row of clickResult.data) {
      const day = row.created_at.slice(0, 10);
      clicksByDay.set(day, (clicksByDay.get(day) || 0) + 1);
    }
  }

  // Transform based on requested metric
  const points = Array.from(dayMap.entries()).map(([day, stats]) => {
    let value: number;

    switch (metric) {
      case 'click_rate':
        const clicks = clicksByDay.get(day) || 0;
        value = stats.sends > 0 ? Number(((clicks / stats.sends) * 100).toFixed(2)) : 0;
        break;
      case 'clicks':
        value = clicksByDay.get(day) || 0;
        break;
      case 'reply_rate':
        value = stats.sends > 0 ? Number(((stats.replies / stats.sends) * 100).toFixed(2)) : 0;
        break;
      case 'opt_out_rate':
        value = stats.sends > 0 ? Number(((stats.opt_outs / stats.sends) * 100).toFixed(2)) : 0;
        break;
      case 'bounce_rate':
        value = stats.sends > 0 ? Number(((stats.bounces / stats.sends) * 100).toFixed(2)) : 0;
        break;
      case 'replies':
        value = stats.replies;
        break;
      case 'opt_outs':
        value = stats.opt_outs;
        break;
      case 'bounces':
        value = stats.bounces;
        break;
      case 'sends':
      default:
        value = stats.sends;
        break;
    }

    return { day, value };
  });

  return {
    metric,
    points: fillMissingDays(points, startDate, endDate),
    start_date: startDate,
    end_date: endDate,
  };
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`timeseries:${clientId}`, RATE_LIMIT_READ);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(req.url);
  const metric = searchParams.get('metric') || 'sends';
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const campaign = searchParams.get('campaign');
  const workspaceId = getWorkspaceId(searchParams.get('workspace_id'));

  // Workspace access validation (SECURITY: Prevents unauthorized data access)
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) {
    return accessError;
  }

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // Return empty data if Supabase is not configured
  if (!supabaseAdmin) {
    return NextResponse.json({
      metric,
      points: fillMissingDays([], startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      source: 'fallback',
    }, { headers: API_HEADERS });
  }

  try {
    // Generate cache key
    const cacheKey = apiCacheKey('timeseries', {
      metric,
      start: startDate,
      end: endDate,
      campaign: campaign || undefined,
      workspace: workspaceId,
    });

    // Use cache with 30 second TTL
    const data = await cacheManager.getOrSet(
      cacheKey,
      () => fetchTimeseriesData(metric, startDate, endDate, workspaceId, campaign),
      CACHE_TTL.SHORT
    );

    return NextResponse.json(data, { headers: API_HEADERS });
  } catch (error) {
    console.error('Timeseries API error:', error);
    return NextResponse.json({
      metric,
      points: fillMissingDays([], startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      source: 'fallback',
    }, { headers: API_HEADERS });
  }
}

// Fill in missing days with zero values
function fillMissingDays(
  points: { day: string; value: number }[],
  startDate: string,
  endDate: string
): { day: string; value: number }[] {
  const pointMap = new Map(points.map(p => [p.day, p.value]));
  const result: { day: string; value: number }[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().slice(0, 10);
    result.push({
      day: dayStr,
      value: pointMap.get(dayStr) || 0,
    });
  }
  
  return result;
}
