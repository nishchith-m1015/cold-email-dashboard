import { NextRequest, NextResponse } from 'next/server';
import { 
  jsonResponse, 
  errorResponse, 
  serverError, 
  requireSupabase, 
  getSearchParams,
  parseDateRange,
  getWorkspaceFromParams,
} from '@/lib/api-utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`by-sender:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const supabase = requireSupabase();
    if (!supabase.available) return supabase.response;

    const params = getSearchParams(req);
    const workspaceId = getWorkspaceFromParams(params);
    const { startDate, endDate } = parseDateRange(
      params.get('start'),
      params.get('end')
    );
    const senderFilter = params.get('sender');
    const campaign = params.get('campaign');

    // Build query for sender stats
    let query = supabase.client
      .from('email_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .gte('event_ts', `${startDate}T00:00:00Z`)
      .lte('event_ts', `${endDate}T23:59:59Z`);

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    if (senderFilter) {
      query = query.ilike('metadata->>sender_email', `%${senderFilter}%`);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return errorResponse('Database query failed', 500);
    }

    // Aggregate by sender
    const senderMap = new Map<string, {
      sender_email: string;
      sends: number;
      replies: number;
      opt_outs: number;
      bounces: number;
      opens: number;
      clicks: number;
      campaigns: Set<string>;
    }>();

    for (const event of events || []) {
      // Extract sender from metadata or use 'unknown'
      const senderEmail = 
        (event.metadata as Record<string, unknown>)?.sender_email as string || 
        'unknown';

      if (!senderMap.has(senderEmail)) {
        senderMap.set(senderEmail, {
          sender_email: senderEmail,
          sends: 0,
          replies: 0,
          opt_outs: 0,
          bounces: 0,
          opens: 0,
          clicks: 0,
          campaigns: new Set(),
        });
      }

      const stats = senderMap.get(senderEmail)!;
      
      if (event.campaign_name) {
        stats.campaigns.add(event.campaign_name);
      }

      switch (event.event_type) {
        case 'sent':
        case 'delivered':
          stats.sends++;
          break;
        case 'replied':
          stats.replies++;
          break;
        case 'opt_out':
          stats.opt_outs++;
          break;
        case 'bounced':
          stats.bounces++;
          break;
        case 'opened':
          stats.opens++;
          break;
        case 'clicked':
          stats.clicks++;
          break;
      }
    }

    // Convert to array with calculated rates
    const senders = Array.from(senderMap.values()).map(s => ({
      sender_email: s.sender_email,
      sends: s.sends,
      replies: s.replies,
      opt_outs: s.opt_outs,
      bounces: s.bounces,
      opens: s.opens,
      clicks: s.clicks,
      reply_rate: s.sends > 0 ? (s.replies / s.sends) * 100 : 0,
      opt_out_rate: s.sends > 0 ? (s.opt_outs / s.sends) * 100 : 0,
      open_rate: s.sends > 0 ? (s.opens / s.sends) * 100 : 0,
      click_rate: s.sends > 0 ? (s.clicks / s.sends) * 100 : 0,
      campaigns: Array.from(s.campaigns),
      campaign_count: s.campaigns.size,
    }));

    // Sort by sends descending
    senders.sort((a, b) => b.sends - a.sends);

    return jsonResponse({
      senders,
      summary: {
        total_senders: senders.length,
        total_sends: senders.reduce((acc, s) => acc + s.sends, 0),
        total_replies: senders.reduce((acc, s) => acc + s.replies, 0),
        date_range: { start: startDate, end: endDate },
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
