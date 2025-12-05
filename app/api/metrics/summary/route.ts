import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getWorkspaceId } from '@/lib/supabase';
import { fetchSheetData, calculateSheetStats } from '@/lib/google-sheets';
import { API_HEADERS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Empty response helper
function emptyResponse(startDate: string, endDate: string, source = 'fallback') {
  return NextResponse.json({
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
  }, { headers: API_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source'); // 'sheets' to force Google Sheets
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  
  // Default to last 7 days
  const startDate = start || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // If source=sheets or Supabase not configured, use Google Sheets
  if (source === 'sheets' || !supabaseAdmin) {
    try {
      const sheetData = await fetchSheetData('Ohio');
      if (sheetData) {
        const stats = calculateSheetStats(sheetData);
        return NextResponse.json({
          sends: stats.totalSends,
          replies: stats.replies,
          opt_outs: stats.optOuts,
          bounces: 0,
          opens: 0,
          clicks: 0,
          reply_rate_pct: Number(stats.replyRate.toFixed(2)),
          opt_out_rate_pct: Number(stats.optOutRate.toFixed(2)),
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
          source: 'google_sheets',
          campaign: stats.campaignName,
          total_contacts: stats.totalContacts,
        }, { headers: API_HEADERS });
      }
    } catch (error) {
      console.error('Google Sheets fetch error:', error);
    }

    // Fallback to empty if Sheets also fails
    if (!supabaseAdmin) {
      return emptyResponse(startDate, endDate, 'no_supabase');
    }
  }

  const campaign = searchParams.get('campaign');
  const workspaceId = getWorkspaceId(searchParams.get('workspace_id'));

  try {
    // Query daily_stats for the period
    let query = supabaseAdmin
      .from('daily_stats')
      .select('sends, replies, opt_outs, bounces, opens, clicks')
      .eq('workspace_id', workspaceId)
      .gte('day', startDate)
      .lte('day', endDate);

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    const { data: statsData, error: statsError } = await query;

    if (statsError) {
      console.error('Stats query error:', statsError);
      return emptyResponse(startDate, endDate, 'db_error');
    }

    // Aggregate stats
    const totals = (statsData || []).reduce(
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

    // Query LLM costs for the period
    let costQuery = supabaseAdmin
      .from('llm_usage')
      .select('cost_usd')
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (campaign) {
      costQuery = costQuery.eq('campaign_name', campaign);
    }

    const { data: costData, error: costError } = await costQuery;

    if (costError) {
      console.error('Cost query error:', costError);
    }

    const totalCost = (costData || []).reduce(
      (sum, row) => sum + (Number(row.cost_usd) || 0),
      0
    );

    // Get previous period for comparison
    const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 3600 * 1000)) + 1;
    const prevStartDate = new Date(new Date(startDate).getTime() - periodDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const prevEndDate = new Date(new Date(startDate).getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10);

    let prevQuery = supabaseAdmin
      .from('daily_stats')
      .select('sends, replies, opt_outs')
      .eq('workspace_id', workspaceId)
      .gte('day', prevStartDate)
      .lte('day', prevEndDate);

    if (campaign) {
      prevQuery = prevQuery.eq('campaign_name', campaign);
    }

    const { data: prevData } = await prevQuery;

    const prevTotals = (prevData || []).reduce(
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
    const optOutRateChange = 0; // Simplified

    return NextResponse.json({
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
      opt_out_rate_change_pp: optOutRateChange,
      prev_sends: prevTotals.sends,
      prev_reply_rate_pct: prevReplyRatePct,
      start_date: startDate,
      end_date: endDate,
      source: 'supabase',
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Summary API error:', error);
    return emptyResponse(startDate, endDate, 'error');
  }
}
