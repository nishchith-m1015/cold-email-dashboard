import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { fetchSheetData, calculateSheetStats } from '@/lib/google-sheets';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`by-campaign:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');

  // If source=sheets or Supabase not configured, use Google Sheets
  if (source === 'sheets' || !supabaseAdmin) {
    try {
      const sheetData = await fetchSheetData('Ohio');
      if (sheetData) {
        const stats = calculateSheetStats(sheetData);
        const replyRatePct = stats.uniqueContactsSent > 0 
          ? Number(((stats.replies / stats.uniqueContactsSent) * 100).toFixed(2)) 
          : 0;
        const optOutRatePct = stats.uniqueContactsSent > 0 
          ? Number(((stats.optOuts / stats.uniqueContactsSent) * 100).toFixed(2)) 
          : 0;

        return NextResponse.json({
          campaigns: [{
            campaign: stats.campaignName,
            sends: stats.totalSends,
            replies: stats.replies,
            opt_outs: stats.optOuts,
            bounces: 0,
            reply_rate_pct: replyRatePct,
            opt_out_rate_pct: optOutRatePct,
            bounce_rate_pct: 0,
            cost_usd: 0, // No cost data in Google Sheets
            cost_per_reply: 0,
            // Additional Google Sheets specific data
            email_1_sends: stats.email1Sends,
            email_2_sends: stats.email2Sends,
            email_3_sends: stats.email3Sends,
            total_contacts: stats.totalContacts,
          }],
          start_date: new Date().toISOString().slice(0, 10),
          end_date: new Date().toISOString().slice(0, 10),
          source: 'google_sheets',
        }, { headers: API_HEADERS });
      }
    } catch (error) {
      console.error('Google Sheets fetch error:', error);
    }

    // Fallback to empty if both fail
    if (!supabaseAdmin) {
      return NextResponse.json({
        campaigns: [],
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
      }, { headers: API_HEADERS });
    }
  }

  // Use already extracted searchParams
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  try {
    // Query daily_stats grouped by campaign
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('daily_stats')
      .select('campaign_name, sends, replies, opt_outs, bounces')
      .eq('workspace_id', workspaceId)
      .gte('day', startDate)
      .lte('day', endDate);

    if (statsError) {
      console.error('By-campaign query error:', statsError);
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // Aggregate by campaign
    const campaignMap = new Map<string, { 
      sends: number; 
      replies: number; 
      opt_outs: number; 
      bounces: number;
    }>();

    for (const row of statsData || []) {
      const campaignName = row.campaign_name || 'Unknown';
      const existing = campaignMap.get(campaignName) || { 
        sends: 0, 
        replies: 0, 
        opt_outs: 0, 
        bounces: 0,
      };
      campaignMap.set(campaignName, {
        sends: existing.sends + (row.sends || 0),
        replies: existing.replies + (row.replies || 0),
        opt_outs: existing.opt_outs + (row.opt_outs || 0),
        bounces: existing.bounces + (row.bounces || 0),
      });
    }

    // Query LLM costs by campaign
    const { data: costData, error: costError } = await supabaseAdmin
      .from('llm_usage')
      .select('campaign_name, cost_usd')
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (costError) {
      console.error('Cost query error:', costError);
    }

    // Aggregate costs by campaign
    const costMap = new Map<string, number>();
    for (const row of costData || []) {
      const campaignName = row.campaign_name || 'Unknown';
      const existing = costMap.get(campaignName) || 0;
      costMap.set(campaignName, existing + (Number(row.cost_usd) || 0));
    }

    // Build response
    const campaigns = Array.from(campaignMap.entries()).map(([name, stats]) => {
      const replyRatePct = stats.sends > 0 
        ? Number(((stats.replies / stats.sends) * 100).toFixed(2)) 
        : 0;
      const optOutRatePct = stats.sends > 0 
        ? Number(((stats.opt_outs / stats.sends) * 100).toFixed(2)) 
        : 0;
      const bounceRatePct = stats.sends > 0 
        ? Number(((stats.bounces / stats.sends) * 100).toFixed(2)) 
        : 0;
      const costUsd = Number((costMap.get(name) || 0).toFixed(2));
      const costPerReply = stats.replies > 0 
        ? Number((costUsd / stats.replies).toFixed(2)) 
        : 0;

      return {
        campaign: name,
        sends: stats.sends,
        replies: stats.replies,
        opt_outs: stats.opt_outs,
        bounces: stats.bounces,
        reply_rate_pct: replyRatePct,
        opt_out_rate_pct: optOutRatePct,
        bounce_rate_pct: bounceRatePct,
        cost_usd: costUsd,
        cost_per_reply: costPerReply,
      };
    });

    // Sort by sends descending
    campaigns.sort((a, b) => b.sends - a.sends);

    return NextResponse.json({
      campaigns,
      start_date: startDate,
      end_date: endDate,
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('By-campaign API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

