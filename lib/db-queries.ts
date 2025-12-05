/**
 * Optimized Database Queries
 * 
 * Centralized query functions with:
 * - Proper index hints
 * - Efficient date range filtering
 * - Workspace scoping
 * - Error handling
 */

import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from './supabase';

// ============================================
// TYPES
// ============================================

export interface DateRange {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
}

export interface QueryOptions {
  workspaceId?: string;
  campaign?: string;
  limit?: number;
}

export interface DailyStatsRow {
  day: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens: number;
  clicks: number;
  campaign_name?: string;
}

export interface LlmUsageRow {
  id: string;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
  campaign_name?: string;
}

// ============================================
// DAILY STATS QUERIES
// ============================================

/**
 * Get aggregated daily stats for a date range
 * Optimized: Uses day index, minimal columns
 */
export async function getDailyStats(
  dateRange: DateRange,
  options: QueryOptions = {}
): Promise<{ data: DailyStatsRow[] | null; error: Error | null }> {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Database not configured') };
  }

  const { workspaceId = DEFAULT_WORKSPACE_ID, campaign } = options;

  try {
    let query = supabaseAdmin
      .from('daily_stats')
      .select('day, sends, replies, opt_outs, bounces, opens, clicks, campaign_name')
      .eq('workspace_id', workspaceId)
      .gte('day', dateRange.start)
      .lte('day', dateRange.end)
      .order('day', { ascending: true });

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getDailyStats error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get summary totals for a date range
 * Optimized: Single query with aggregation in JS (Supabase doesn't support SUM natively well)
 */
export async function getSummaryTotals(
  dateRange: DateRange,
  options: QueryOptions = {}
): Promise<{
  data: {
    sends: number;
    replies: number;
    opt_outs: number;
    bounces: number;
    opens: number;
    clicks: number;
  } | null;
  error: Error | null;
}> {
  const result = await getDailyStats(dateRange, options);
  
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }

  const totals = result.data.reduce(
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

  return { data: totals, error: null };
}

// ============================================
// LLM USAGE QUERIES
// ============================================

/**
 * Get LLM usage/costs for a date range
 * Optimized: Uses created_at index, minimal columns
 */
export async function getLlmUsage(
  dateRange: DateRange,
  options: QueryOptions & { provider?: string } = {}
): Promise<{ data: LlmUsageRow[] | null; error: Error | null }> {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Database not configured') };
  }

  const { workspaceId = DEFAULT_WORKSPACE_ID, campaign, provider, limit = 1000 } = options;

  try {
    let query = supabaseAdmin
      .from('llm_usage')
      .select('id, provider, model, tokens_in, tokens_out, cost_usd, created_at, campaign_name')
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${dateRange.start}T00:00:00Z`)
      .lte('created_at', `${dateRange.end}T23:59:59Z`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    if (provider && provider !== 'all') {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('getLlmUsage error:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get total LLM cost for a date range
 */
export async function getTotalCost(
  dateRange: DateRange,
  options: QueryOptions & { provider?: string } = {}
): Promise<{ data: number | null; error: Error | null }> {
  const result = await getLlmUsage(dateRange, options);
  
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }

  const total = result.data.reduce(
    (sum, row) => sum + (Number(row.cost_usd) || 0),
    0
  );

  return { data: Number(total.toFixed(6)), error: null };
}

// ============================================
// EMAIL EVENTS QUERIES
// ============================================

/**
 * Get event counts by type for a date range
 * Optimized: Uses created_at and event_type indexes
 */
export async function getEventCounts(
  dateRange: DateRange,
  eventTypes: string[],
  options: QueryOptions = {}
): Promise<{ data: Record<string, number> | null; error: Error | null }> {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Database not configured') };
  }

  const { workspaceId = DEFAULT_WORKSPACE_ID, campaign } = options;

  try {
    let query = supabaseAdmin
      .from('email_events')
      .select('event_type')
      .eq('workspace_id', workspaceId)
      .in('event_type', eventTypes)
      .gte('created_at', `${dateRange.start}T00:00:00Z`)
      .lte('created_at', `${dateRange.end}T23:59:59Z`);

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count by type
    const counts: Record<string, number> = {};
    eventTypes.forEach(type => { counts[type] = 0; });
    
    (data || []).forEach(row => {
      counts[row.event_type] = (counts[row.event_type] || 0) + 1;
    });

    return { data: counts, error: null };
  } catch (error) {
    console.error('getEventCounts error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================
// CAMPAIGN QUERIES
// ============================================

/**
 * Get distinct campaign names
 * Optimized: Uses campaign_name index
 */
export async function getCampaigns(
  options: Pick<QueryOptions, 'workspaceId' | 'limit'> = {}
): Promise<{ data: string[] | null; error: Error | null }> {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Database not configured') };
  }

  const { workspaceId = DEFAULT_WORKSPACE_ID, limit = 100 } = options;

  try {
    const { data, error } = await supabaseAdmin
      .from('daily_stats')
      .select('campaign_name')
      .eq('workspace_id', workspaceId)
      .not('campaign_name', 'is', null)
      .limit(limit);

    if (error) throw error;

    // Get unique campaign names
    const unique = [...new Set((data || []).map(r => r.campaign_name).filter(Boolean))];
    
    return { data: unique as string[], error: null };
  } catch (error) {
    console.error('getCampaigns error:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return supabaseAdmin !== null;
}

/**
 * Get default date range (last 30 days)
 */
export function getDefaultDateRange(daysBack = 30): DateRange {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString().slice(0, 10);
  return { start, end };
}

