import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check if Supabase is configured
  if (!supabaseAdmin) {
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get('metric') || 'sends';
    return NextResponse.json({
      metric,
      points: [],
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }, { headers: { 'content-type': 'application/json' } });
  }

  const { searchParams } = new URL(req.url);
  const metric = searchParams.get('metric') || 'sends';
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const campaign = searchParams.get('campaign');
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  try {
    // Query daily_stats for the period
    let query = supabaseAdmin
      .from('daily_stats')
      .select('day, sends, replies, opt_outs, bounces')
      .eq('workspace_id', workspaceId)
      .gte('day', startDate)
      .lte('day', endDate)
      .order('day', { ascending: true });

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Timeseries query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by day if there are multiple campaigns
    const dayMap = new Map<string, { sends: number; replies: number; opt_outs: number; bounces: number }>();
    
    for (const row of data || []) {
      const existing = dayMap.get(row.day) || { sends: 0, replies: 0, opt_outs: 0, bounces: 0 };
      dayMap.set(row.day, {
        sends: existing.sends + (row.sends || 0),
        replies: existing.replies + (row.replies || 0),
        opt_outs: existing.opt_outs + (row.opt_outs || 0),
        bounces: existing.bounces + (row.bounces || 0),
      });
    }

    // Transform based on requested metric
    const points = Array.from(dayMap.entries()).map(([day, stats]) => {
      let value: number;

      switch (metric) {
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

    // Fill in missing days with zeros
    const filledPoints = fillMissingDays(points, startDate, endDate);

    return NextResponse.json({
      metric,
      points: filledPoints,
      start_date: startDate,
      end_date: endDate,
    }, { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    console.error('Timeseries API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
