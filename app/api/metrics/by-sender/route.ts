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
import { cacheManager, apiCacheKey, CACHE_TTL } from '@/lib/cache';
import { EXCLUDED_CAMPAIGNS, shouldExcludeCampaign } from '@/lib/db-queries';
import { SupabaseClient } from '@supabase/supabase-js';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

// Types
interface SenderStats {
  sender_email: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens: number;
  clicks: number;
  reply_rate: number;
  opt_out_rate: number;
  open_rate: number;
  click_rate: number;
  campaigns: string[];
  campaign_count: number;
}

interface BySenderResponse {
  senders: SenderStats[];
  summary: {
    total_senders: number;
    total_sends: number;
    total_replies: number;
    date_range: { start: string; end: string };
  };
}

// Core data fetching (used by cache)
async function fetchBySenderData(
  client: SupabaseClient,
  startDate: string,
  endDate: string,
  workspaceId: string,
  campaign?: string | null,
  senderFilter?: string | null
): Promise<BySenderResponse> {
  // Build query for sender stats
  let query = client
    .from('email_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`);

  // Apply campaign filter OR global exclusion
  if (campaign) {
    query = query.eq('campaign_name', campaign);
  } else {
    // Exclude test campaigns globally
    for (const excludedCampaign of EXCLUDED_CAMPAIGNS) {
      query = query.neq('campaign_name', excludedCampaign);
    }
  }

  if (senderFilter) {
    query = query.ilike('metadata->>sender_email', `%${senderFilter}%`);
  }

  const { data: events, error } = await query;

  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }

  // Get sender emails from leads_ohio table (join on contact_email)
  const contactEmails = [...new Set((events || []).map(e => e.contact_email).filter(Boolean))];
  
  let senderLookup = new Map<string, string>();
  if (contactEmails.length > 0) {
    const { data: leadsData } = await client
      .from('leads_ohio')
      .select('email_address, sender_email')
      .eq('workspace_id', workspaceId)
      .in('email_address', contactEmails);
    
    for (const lead of leadsData || []) {
      if (lead.sender_email) {
        senderLookup.set(lead.email_address?.toLowerCase(), lead.sender_email);
      }
    }
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
    // Skip events from excluded campaigns (safety filter)
    if (shouldExcludeCampaign(event.campaign_name)) continue;

    // Get sender email: first check leads_ohio lookup, then metadata, fallback to 'unknown'
    const senderEmail = 
      senderLookup.get(event.contact_email?.toLowerCase()) ||
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

  return {
    senders,
    summary: {
      total_senders: senders.length,
      total_sends: senders.reduce((acc, s) => acc + s.sends, 0),
      total_replies: senders.reduce((acc, s) => acc + s.replies, 0),
      date_range: { start: startDate, end: endDate },
    },
  };
}

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
    
    // Workspace access validation (SECURITY: Prevents unauthorized data access)
    const accessError = await validateWorkspaceAccess(req, params);
    if (accessError) {
      return accessError;
    }
    const { startDate, endDate } = parseDateRange(
      params.get('start'),
      params.get('end')
    );
    const senderFilter = params.get('sender');
    const campaign = params.get('campaign');

    // Generate cache key (exclude sender filter as it's a search)
    const cacheKey = apiCacheKey('by-sender', {
      start: startDate,
      end: endDate,
      campaign: campaign || undefined,
      sender: senderFilter || undefined,
      workspace: workspaceId,
    });

    // Use cache with 30 second TTL
    const data = await cacheManager.getOrSet(
      cacheKey,
      () => fetchBySenderData(
        supabase.client, 
        startDate, 
        endDate, 
        workspaceId, 
        campaign, 
        senderFilter
      ),
      CACHE_TTL.SHORT
    );

    return jsonResponse(data);
  } catch (error) {
    return serverError(error);
  }
}
