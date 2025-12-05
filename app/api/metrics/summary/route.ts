import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getWorkspaceId } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { cacheManager, apiCacheKey, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Response types
interface SummaryResponse {
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens: number;
  clicks: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  open_rate_pct: number;
  click_rate_pct: number;
  cost_usd: number;
  sends_change_pct: number;
  reply_rate_change_pp: number;
  opt_out_rate_change_pp: number;
  prev_sends: number;
  prev_reply_rate_pct: number;
  start_date: string;
  end_date: string;
  source: string;
  cached?: boolean;
}

// Empty response helper
function emptyResponse(startDate: string, endDate: string, source = 'supabase'): SummaryResponse {
  return {
    sends: 0,
    replies: 0,
    opt_outs: 0,
    bounces: 0,
    opens: 0,
    clicks: 0,
    reply_rate_pct: 0,
    opt_out_rate_pct: 0,
    bounce_rate_pct: 0,
    open_rate_pct: 0,
    click_rate_pct: 0,
    cost_usd: 0,
    sends_change_pct: 0,
    reply_rate_change_pp: 0,
    opt_out_rate_change_pp: 0,
    prev_sends: 0,
    prev_reply_rate_pct: 0,
    start_date: startDate,
    end_date: endDate,
    source,
  };
}

// Core data fetching (used by cache)
async function fetchSummaryData(
  startDate: string,
  endDate: string,
  workspaceId: string,
  campaign?: string | null
): Promise<SummaryResponse> {
  if (!supabaseAdmin) {
    return emptyResponse(startDate, endDate, 'no_database');
  }

  // Calculate previous period dates upfront
  const periodDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 3600 * 1000)
  ) + 1;
  const prevStartDate = new Date(
    new Date(startDate).getTime() - periodDays * 24 * 3600 * 1000
  ).toISOString().slice(0, 10);
  const prevEndDate = new Date(
    new Date(startDate).getTime() - 24 * 3600 * 1000
  ).toISOString().slice(0, 10);

  // Build queries
  let currentStatsQuery = supabaseAdmin
    .from('daily_stats')
    .select('sends, replies, opt_outs, bounces, opens, clicks')
    .eq('workspace_id', workspaceId)
    .gte('day', startDate)
    .lte('day', endDate);

  let costQuery = supabaseAdmin
    .from('llm_usage')
    .select('cost_usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);

  let prevStatsQuery = supabaseAdmin
    .from('daily_stats')
    .select('sends, replies, opt_outs')
    .eq('workspace_id', workspaceId)
    .gte('day', prevStartDate)
    .lte('day', prevEndDate);

  if (campaign) {
    currentStatsQuery = currentStatsQuery.eq('campaign_name', campaign);
    costQuery = costQuery.eq('campaign_name', campaign);
    prevStatsQuery = prevStatsQuery.eq('campaign_name', campaign);
  }

  // Execute ALL queries in parallel (3 queries → 1 round trip latency)
  const [statsResult, costResult, prevResult] = await Promise.all([
    currentStatsQuery,
    costQuery,
    prevStatsQuery,
  ]);

  if (statsResult.error) {
    console.error('Stats query error:', statsResult.error);
    return emptyResponse(startDate, endDate, 'db_error');
  }

  // Aggregate current period stats
  const totals = (statsResult.data || []).reduce(
    (acc, row) => ({
      sends: acc.sends + (row.sends || 0),
      replies: acc.replies + (row.replies || 0),
      opt_outs: acc.opt_outs + (row.opt_outs || 0),
      bounces: acc.bounces + (row.bounces || 0),
      opens: acc.opens + (row.opens || 0),
      clicks: acc.clicks + (row.clicks || 0),
    }),
    { sends: 0, replies: 0, opt_outs: 0, bounces: 0, opens: 0, clicks: 0 }
  );

  // Calculate rates
  const replyRatePct = totals.sends > 0
    ? Number(((totals.replies / totals.sends) * 100).toFixed(2))
    : 0;
  const optOutRatePct = totals.sends > 0
    ? Number(((totals.opt_outs / totals.sends) * 100).toFixed(2))
    : 0;
  const bounceRatePct = totals.sends > 0
    ? Number(((totals.bounces / totals.sends) * 100).toFixed(2))
    : 0;
  const openRatePct = totals.sends > 0
    ? Number(((totals.opens / totals.sends) * 100).toFixed(2))
    : 0;
  const clickRatePct = totals.sends > 0
    ? Number(((totals.clicks / totals.sends) * 100).toFixed(2))
    : 0;

  // Calculate total cost
  const totalCost = (costResult.data || []).reduce(
    (sum, row) => sum + (Number(row.cost_usd) || 0),
    0
  );

  // Aggregate previous period stats
  const prevTotals = (prevResult.data || []).reduce(
    (acc, row) => ({
      sends: acc.sends + (row.sends || 0),
      replies: acc.replies + (row.replies || 0),
      opt_outs: acc.opt_outs + (row.opt_outs || 0),
    }),
    { sends: 0, replies: 0, opt_outs: 0 }
  );

  const prevReplyRatePct = prevTotals.sends > 0
    ? Number(((prevTotals.replies / prevTotals.sends) * 100).toFixed(2))
    : 0;

  // Calculate changes
  const sendsChange = prevTotals.sends > 0
    ? Number((((totals.sends - prevTotals.sends) / prevTotals.sends) * 100).toFixed(1))
    : 0;
  const replyRateChange = Number((replyRatePct - prevReplyRatePct).toFixed(2));

  return {
    sends: totals.sends,
    replies: totals.replies,
    opt_outs: totals.opt_outs,
    bounces: totals.bounces,
    opens: totals.opens,
    clicks: totals.clicks,
    reply_rate_pct: replyRatePct,
    opt_out_rate_pct: optOutRatePct,
    bounce_rate_pct: bounceRatePct,
    open_rate_pct: openRatePct,
    click_rate_pct: clickRatePct,
    cost_usd: Number(totalCost.toFixed(2)),
    sends_change_pct: sendsChange,
    reply_rate_change_pp: replyRateChange,
    opt_out_rate_change_pp: 0,
    prev_sends: prevTotals.sends,
    prev_reply_rate_pct: prevReplyRatePct,
    start_date: startDate,
    end_date: endDate,
    source: 'supabase',
  };
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`summary:${clientId}`, RATE_LIMIT_READ);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const campaign = searchParams.get('campaign');
  const workspaceId = getWorkspaceId(searchParams.get('workspace_id'));

  // Default to last 7 days
  const startDate = start || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // Require Supabase
  if (!supabaseAdmin) {
    console.error('Supabase not configured');
    return NextResponse.json(emptyResponse(startDate, endDate, 'no_database'), { headers: API_HEADERS });
  }

  try {
    // Generate cache key based on query params
    const cacheKey = apiCacheKey('summary', {
      start: startDate,
      end: endDate,
      campaign: campaign || undefined,
      workspace: workspaceId,
    });

    // Use cache with stale-while-revalidate (30 second fresh, 60 second stale)
    const data = await cacheManager.getOrSet(
      cacheKey,
      () => fetchSummaryData(startDate, endDate, workspaceId, campaign),
      CACHE_TTL.SHORT
    );

    return NextResponse.json(data, { headers: API_HEADERS });
  } catch (error) {
    console.error('Summary API error:', error);
    return NextResponse.json(emptyResponse(startDate, endDate, 'error'), { headers: API_HEADERS });
  }
}
