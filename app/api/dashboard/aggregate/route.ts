import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { cacheManager, apiCacheKey, CACHE_TTL } from '@/lib/cache';
import { EXCLUDED_CAMPAIGNS, shouldExcludeCampaign } from '@/lib/db-queries';

export const dynamic = 'force-dynamic';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SummaryData {
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
}

interface TimeseriesPoint {
  day: string;
  value: number;
}

interface TimeseriesData {
  sends: TimeseriesPoint[];
  replies: TimeseriesPoint[];
  reply_rate: TimeseriesPoint[];
  click_rate: TimeseriesPoint[];
  opt_out_rate: TimeseriesPoint[];
}

interface CostBreakdownData {
  total: {
    cost_usd: number;
    tokens_in: number;
    tokens_out: number;
    calls: number;
  };
  by_provider: Array<{
    provider: string;
    cost_usd: number;
    tokens_in: number;
    tokens_out: number;
    calls: number;
  }>;
  by_model: Array<{
    model: string;
    provider: string;
    cost_usd: number;
    tokens_in: number;
    tokens_out: number;
    calls: number;
  }>;
  daily: TimeseriesPoint[];
}

interface StepBreakdown {
  step: number;
  name: string;
  sends: number;
  lastSentAt?: string;
}

interface DailySend {
  date: string;
  count: number;
}

interface StepBreakdownData {
  steps: StepBreakdown[];
  dailySends: DailySend[];
  totalSends: number;
  uniqueContacts: number;
  totalLeads: number;
}

interface CampaignStats {
  campaign: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  bounce_rate_pct: number;
  cost_usd: number;
  cost_per_reply: number;
}

interface AggregateResponse {
  summary: SummaryData;
  timeseries: TimeseriesData;
  costBreakdown: CostBreakdownData;
  stepBreakdown: StepBreakdownData;
  campaigns: {
    list: Array<{ name: string }>;
    stats: CampaignStats[];
  };
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
  cached?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function fillMissingDays(
  points: TimeseriesPoint[],
  startDate: string,
  endDate: string
): TimeseriesPoint[] {
  const pointMap = new Map(points.map(p => [p.day, p.value]));
  const result: TimeseriesPoint[] = [];
  
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

function emptyResponse(startDate: string, endDate: string): AggregateResponse {
  return {
    summary: {
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
    },
    timeseries: {
      sends: fillMissingDays([], startDate, endDate),
      replies: fillMissingDays([], startDate, endDate),
      reply_rate: fillMissingDays([], startDate, endDate),
      click_rate: fillMissingDays([], startDate, endDate),
      opt_out_rate: fillMissingDays([], startDate, endDate),
    },
    costBreakdown: {
      total: { cost_usd: 0, tokens_in: 0, tokens_out: 0, calls: 0 },
      by_provider: [],
      by_model: [],
      daily: [],
    },
    stepBreakdown: {
      steps: [
        { step: 1, name: 'Email 1 (Initial Outreach)', sends: 0 },
        { step: 2, name: 'Email 2 (Follow-up)', sends: 0 },
        { step: 3, name: 'Email 3 (Final Follow-up)', sends: 0 },
      ],
      dailySends: [],
      totalSends: 0,
      uniqueContacts: 0,
      totalLeads: 0,
    },
    campaigns: {
      list: [],
      stats: [],
    },
    dateRange: { start: startDate, end: endDate },
    source: 'no_database',
  };
}

// ============================================
// CORE DATA FETCHING (ALL QUERIES IN PARALLEL)
// ============================================

async function fetchAggregateData(
  startDate: string,
  endDate: string,
  workspaceId: string,
  campaign?: string | null,
  providerFilter?: string | null
): Promise<AggregateResponse> {
  if (!supabaseAdmin) {
    return emptyResponse(startDate, endDate);
  }

  // Calculate previous period dates
  const periodDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 3600 * 1000)
  ) + 1;
  const prevStartDate = new Date(
    new Date(startDate).getTime() - periodDays * 24 * 3600 * 1000
  ).toISOString().slice(0, 10);
  const prevEndDate = new Date(
    new Date(startDate).getTime() - 24 * 3600 * 1000
  ).toISOString().slice(0, 10);

  // ============================================
  // BUILD ALL QUERIES (OPTIMIZED WITH MATERIALIZED VIEWS)
  // ============================================

  // OPTIMIZATION: Use materialized views for aggregated data
  // This reduces query complexity from O(n) table scans to O(1) index lookups
  
  // 1. Summary data from mv_daily_stats (much faster than email_events scan)
  let currentStatsQuery = supabaseAdmin
    .from('mv_daily_stats')
    .select('day, campaign_name, sends, delivered, opens, clicks, replies, bounces, opt_outs, unique_contacts, email_1_sends, email_2_sends, email_3_sends')
    .gte('day', startDate)
    .lte('day', endDate);

  // 2. Previous period stats for comparison
  let prevStatsQuery = supabaseAdmin
    .from('mv_daily_stats')
    .select('sends, replies')
    .gte('day', prevStartDate)
    .lte('day', prevEndDate);

  // 3. Cost data from mv_llm_cost (aggregated by day/provider/model)
  let costStatsQuery = supabaseAdmin
    .from('mv_llm_cost')
    .select('day, provider, model, total_cost, total_tokens_in, total_tokens_out, call_count')
    .gte('day', startDate)
    .lte('day', endDate);

  // 4. Campaign names (for dropdown)
  let campaignNamesQuery = supabaseAdmin
    .from('mv_daily_stats')
    .select('campaign_name')
    .not('campaign_name', 'is', null);

  // 5. Leads count (for percentage calculation)
  const leadsCountQuery = supabaseAdmin
    .from('leads_ohio')
    .select('*', { count: 'exact', head: true });

  // Apply campaign filter OR global exclusion
  if (campaign) {
    currentStatsQuery = currentStatsQuery.eq('campaign_name', campaign);
    prevStatsQuery = prevStatsQuery.eq('campaign_name', campaign);
    costStatsQuery = costStatsQuery.eq('campaign_name', campaign); // Note: mv_llm_cost doesn't have campaign_name yet
  } else {
    for (const excludedCampaign of EXCLUDED_CAMPAIGNS) {
      currentStatsQuery = currentStatsQuery.neq('campaign_name', excludedCampaign);
      prevStatsQuery = prevStatsQuery.neq('campaign_name', excludedCampaign);
      campaignNamesQuery = campaignNamesQuery.neq('campaign_name', excludedCampaign);
    }
  }

  // Apply provider filter for cost breakdown
  if (providerFilter && providerFilter !== 'all') {
    costStatsQuery = costStatsQuery.eq('provider', providerFilter);
  }

  // ============================================
  // EXECUTE ALL QUERIES IN PARALLEL (OPTIMIZED)
  // ============================================

  const [
    currentStatsResult,
    prevStatsResult,
    costStatsResult,
    campaignNamesResult,
    leadsCountResult,
  ] = await Promise.all([
    currentStatsQuery,
    prevStatsQuery,
    costStatsQuery,
    campaignNamesQuery,
    leadsCountQuery,
  ]);

  // Handle errors
  if (currentStatsResult.error) {
    console.error('Current stats query error:', currentStatsResult.error);
    return emptyResponse(startDate, endDate);
  }

  // ============================================
  // PROCESS SUMMARY DATA (FROM MATERIALIZED VIEW)
  // ============================================

  const dailyStats = currentStatsResult.data || [];
  
  // Aggregate totals from daily stats (already pre-aggregated)
  const totals = dailyStats.reduce((acc, row) => ({
    sends: acc.sends + (row.sends || 0),
    replies: acc.replies + (row.replies || 0),
    opt_outs: acc.opt_outs + (row.opt_outs || 0),
    bounces: acc.bounces + (row.bounces || 0),
    opens: acc.opens + (row.opens || 0),
    clicks: acc.clicks + (row.clicks || 0),
  }), { sends: 0, replies: 0, opt_outs: 0, bounces: 0, opens: 0, clicks: 0 });

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

  // Previous period comparison (also from materialized view)
  const prevStats = prevStatsResult.data || [];
  const prevTotals = prevStats.reduce((acc, row) => ({
    sends: acc.sends + (row.sends || 0),
    replies: acc.replies + (row.replies || 0),
  }), { sends: 0, replies: 0 });
  
  const prevReplyRatePct = prevTotals.sends > 0
    ? Number(((prevTotals.replies / prevTotals.sends) * 100).toFixed(2))
    : 0;

  const sendsChange = prevTotals.sends > 0
    ? Number((((totals.sends - prevTotals.sends) / prevTotals.sends) * 100).toFixed(1))
    : 0;
  const replyRateChange = Number((replyRatePct - prevReplyRatePct).toFixed(2));

  // ============================================
  // PROCESS TIMESERIES DATA (FROM MATERIALIZED VIEW)
  // ============================================

  // Data is already aggregated by day in mv_daily_stats!
  // No need to group by day manually - just use the pre-aggregated values

  // Build timeseries arrays directly from aggregated data
  const sendsPoints: TimeseriesPoint[] = [];
  const repliesPoints: TimeseriesPoint[] = [];
  const replyRatePoints: TimeseriesPoint[] = [];
  const clickRatePoints: TimeseriesPoint[] = [];
  const optOutRatePoints: TimeseriesPoint[] = [];

  for (const row of dailyStats) {
    const day = row.day;
    const sends = row.sends || 0;
    const replies = row.replies || 0;
    const clicks = row.clicks || 0;
    const optOuts = row.opt_outs || 0;

    sendsPoints.push({ day, value: sends });
    repliesPoints.push({ day, value: replies });
    replyRatePoints.push({
      day,
      value: sends > 0 ? Number(((replies / sends) * 100).toFixed(2)) : 0,
    });
    clickRatePoints.push({
      day,
      value: sends > 0 ? Number(((clicks / sends) * 100).toFixed(2)) : 0,
    });
    optOutRatePoints.push({
      day,
      value: sends > 0 ? Number(((optOuts / sends) * 100).toFixed(2)) : 0,
    });
  }

  // ============================================
  // PROCESS COST BREAKDOWN DATA (FROM MATERIALIZED VIEW)
  // ============================================

  const costStats = costStatsResult.data || [];
  const providerMap = new Map<string, { cost_usd: number; tokens_in: number; tokens_out: number; calls: number }>();
  const modelMap = new Map<string, { cost_usd: number; tokens_in: number; tokens_out: number; calls: number; provider: string }>();
  const dailyCosts = new Map<string, number>();

  // Aggregate pre-calculated stats from mv_llm_cost
  for (const row of costStats) {
    const provider = row.provider || 'unknown';
    const model = row.model || 'unknown';
    const cost = Number(row.total_cost) || 0;
    const tokensIn = row.total_tokens_in || 0;
    const tokensOut = row.total_tokens_out || 0;
    const calls = row.call_count || 0;
    const day = row.day;

    // By provider
    const existingProvider = providerMap.get(provider) || { cost_usd: 0, tokens_in: 0, tokens_out: 0, calls: 0 };
    providerMap.set(provider, {
      cost_usd: existingProvider.cost_usd + cost,
      tokens_in: existingProvider.tokens_in + tokensIn,
      tokens_out: existingProvider.tokens_out + tokensOut,
      calls: existingProvider.calls + calls,
    });

    // By model
    const modelKey = `${provider}:${model}`;
    const existingModel = modelMap.get(modelKey) || { cost_usd: 0, tokens_in: 0, tokens_out: 0, calls: 0, provider };
    modelMap.set(modelKey, {
      ...existingModel,
      cost_usd: existingModel.cost_usd + cost,
      tokens_in: existingModel.tokens_in + tokensIn,
      tokens_out: existingModel.tokens_out + tokensOut,
      calls: existingModel.calls + calls,
    });

    // Daily costs
    dailyCosts.set(day, (dailyCosts.get(day) || 0) + cost);
  }

  const byProvider = Array.from(providerMap.entries())
    .map(([provider, stats]) => ({
      provider,
      cost_usd: Number(stats.cost_usd.toFixed(2)),
      tokens_in: stats.tokens_in,
      tokens_out: stats.tokens_out,
      calls: stats.calls,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd);

  const byModel = Array.from(modelMap.entries())
    .map(([key, stats]) => ({
      model: key.split(':')[1],
      provider: stats.provider,
      cost_usd: Number(stats.cost_usd.toFixed(2)),
      tokens_in: stats.tokens_in,
      tokens_out: stats.tokens_out,
      calls: stats.calls,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd);

  const dailyCostTimeseries = Array.from(dailyCosts.entries())
    .map(([day, cost]) => ({ day, value: Number(cost.toFixed(2)) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const totalCostUsd = byProvider.reduce((sum, p) => sum + p.cost_usd, 0);
  const totalTokensIn = byProvider.reduce((sum, p) => sum + p.tokens_in, 0);
  const totalTokensOut = byProvider.reduce((sum, p) => sum + p.tokens_out, 0);
  const totalCalls = byProvider.reduce((sum, p) => sum + p.calls, 0);

  // ============================================
  // PROCESS STEP BREAKDOWN DATA (FROM MATERIALIZED VIEW)
  // ============================================

  // Use the email_X_sends columns from mv_daily_stats
  const stepTotals = dailyStats.reduce((acc, row) => ({
    email_1: acc.email_1 + (row.email_1_sends || 0),
    email_2: acc.email_2 + (row.email_2_sends || 0),
    email_3: acc.email_3 + (row.email_3_sends || 0),
    totalSends: acc.totalSends + (row.sends || 0),
  }), { email_1: 0, email_2: 0, email_3: 0, totalSends: 0 });

  const stepNames: Record<number, string> = {
    1: 'Email 1 (Initial Outreach)',
    2: 'Email 2 (Follow-up)',
    3: 'Email 3 (Final Follow-up)',
  };

  const steps: StepBreakdown[] = [
    {
      step: 1,
      name: stepNames[1],
      sends: stepTotals.email_1,
      lastSentAt: undefined, // Can add this later if needed
    },
    {
      step: 2,
      name: stepNames[2],
      sends: stepTotals.email_2,
      lastSentAt: undefined,
    },
    {
      step: 3,
      name: stepNames[3],
      sends: stepTotals.email_3,
      lastSentAt: undefined,
    },
  ];

  // Daily sends for chart (aggregated from mv_daily_stats)
  const dailySends: DailySend[] = dailyStats.map(row => ({
    date: row.day,
    count: row.sends || 0,
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Unique contacts from mv_daily_stats.unique_contacts
  const uniqueContacts = dailyStats.reduce((sum, row) => sum + (row.unique_contacts || 0), 0);
  const stepTotalSends = stepTotals.totalSends;
  const totalLeads = leadsCountResult.count || 0;

  // ============================================
  // PROCESS CAMPAIGN DATA
  // ============================================

  // Campaign list (unique names)
  const campaignSet = new Set<string>();
  if (!campaignNamesResult.error) {
    for (const row of campaignNamesResult.data || []) {
      if (row.campaign_name && !shouldExcludeCampaign(row.campaign_name)) {
        campaignSet.add(row.campaign_name);
      }
    }
  }
  const campaignList = Array.from(campaignSet)
    .map(name => ({ name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Campaign stats (aggregate by campaign)
  const campaignStatsMap = new Map<string, { sends: number; replies: number; opt_outs: number; bounces: number }>();
  const campaignCostMap = new Map<string, number>();

  for (const row of dailyStats) {
    const name = row.campaign_name || 'Unknown';
    if (shouldExcludeCampaign(name)) continue;
    
    const existing = campaignStatsMap.get(name) || { sends: 0, replies: 0, opt_outs: 0, bounces: 0 };
    campaignStatsMap.set(name, {
      sends: existing.sends + (row.sends || 0),
      replies: existing.replies + (row.replies || 0),
      opt_outs: existing.opt_outs + (row.opt_outs || 0),
      bounces: existing.bounces + (row.bounces || 0),
    });
  }

  // Aggregate costs by campaign from cost stats
  for (const row of costStats) {
    const name = 'Unknown'; // mv_llm_cost doesn't have campaign_name - need to add it later
    campaignCostMap.set(name, (campaignCostMap.get(name) || 0) + (Number(row.total_cost) || 0));
  }

  const campaignStats: CampaignStats[] = Array.from(campaignStatsMap.entries()).map(([name, stats]) => {
    const costUsd = Number((campaignCostMap.get(name) || 0).toFixed(2));
    return {
      campaign: name,
      sends: stats.sends,
      replies: stats.replies,
      opt_outs: stats.opt_outs,
      bounces: stats.bounces,
      reply_rate_pct: stats.sends > 0 ? Number(((stats.replies / stats.sends) * 100).toFixed(2)) : 0,
      opt_out_rate_pct: stats.sends > 0 ? Number(((stats.opt_outs / stats.sends) * 100).toFixed(2)) : 0,
      bounce_rate_pct: stats.sends > 0 ? Number(((stats.bounces / stats.sends) * 100).toFixed(2)) : 0,
      cost_usd: costUsd,
      cost_per_reply: stats.replies > 0 ? Number((costUsd / stats.replies).toFixed(2)) : 0,
    };
  }).sort((a, b) => b.sends - a.sends);

  // ============================================
  // BUILD FINAL RESPONSE
  // ============================================

  return {
    summary: {
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
      cost_usd: Number(totalCostUsd.toFixed(2)),
      sends_change_pct: sendsChange,
      reply_rate_change_pp: replyRateChange,
      opt_out_rate_change_pp: 0,
      prev_sends: prevTotals.sends,
      prev_reply_rate_pct: prevReplyRatePct,
    },
    timeseries: {
      sends: fillMissingDays(sendsPoints, startDate, endDate),
      replies: fillMissingDays(repliesPoints, startDate, endDate),
      reply_rate: fillMissingDays(replyRatePoints, startDate, endDate),
      click_rate: fillMissingDays(clickRatePoints, startDate, endDate),
      opt_out_rate: fillMissingDays(optOutRatePoints, startDate, endDate),
    },
    costBreakdown: {
      total: {
        cost_usd: Number(totalCostUsd.toFixed(2)),
        tokens_in: totalTokensIn,
        tokens_out: totalTokensOut,
        calls: totalCalls,
      },
      by_provider: byProvider,
      by_model: byModel,
      daily: dailyCostTimeseries,
    },
    stepBreakdown: {
      steps,
      dailySends,
      totalSends: stepTotalSends,
      uniqueContacts,
      totalLeads,
    },
    campaigns: {
      list: campaignList,
      stats: campaignStats,
    },
    dateRange: {
      start: startDate,
      end: endDate,
    },
    source: 'supabase',
  };
}

// ============================================
// API HANDLER
// ============================================

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`aggregate:${clientId}`, RATE_LIMIT_READ);

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
  const provider = searchParams.get('provider');
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // Require Supabase
  if (!supabaseAdmin) {
    console.error('Supabase not configured');
    return NextResponse.json(emptyResponse(startDate, endDate), { headers: API_HEADERS });
  }

  try {
    // Generate cache key
    const cacheKey = apiCacheKey('aggregate', {
      start: startDate,
      end: endDate,
      campaign: campaign || undefined,
      provider: provider || undefined,
      workspace: workspaceId,
    });

    // Use cache with 30 second TTL (stale-while-revalidate)
    const data = await cacheManager.getOrSet(
      cacheKey,
      () => fetchAggregateData(startDate, endDate, workspaceId, campaign, provider),
      CACHE_TTL.SHORT
    );

    return NextResponse.json(data, { headers: API_HEADERS });
  } catch (error) {
    console.error('Aggregate API error:', error);
    return NextResponse.json(
      emptyResponse(startDate, endDate),
      { status: 500, headers: API_HEADERS }
    );
  }
}

