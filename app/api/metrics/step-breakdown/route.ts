import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { cacheManager, apiCacheKey, CACHE_TTL } from '@/lib/cache';
import { EXCLUDED_CAMPAIGNS } from '@/lib/db-queries';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

export interface StepBreakdown {
  step: number;
  name: string;
  sends: number;
  lastSentAt?: string;
}

export interface DailySend {
  date: string;
  count: number;
}

export interface StepBreakdownResponse {
  steps: StepBreakdown[];
  dailySends: DailySend[];
  totalSends: number;
  uniqueContacts: number; // Unique people who received at least one email (Email 1 sends)
  totalLeads: number; // Total leads in database for percentage calculation
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
}

// Core data fetching (used by cache)
async function fetchStepBreakdownData(
  startDate: string,
  endDate: string,
  workspaceId: string,
  campaign?: string | null
): Promise<StepBreakdownResponse> {
  if (!supabaseAdmin) {
    return {
      steps: [],
      dailySends: [],
      totalSends: 0,
      uniqueContacts: 0,
      totalLeads: 0,
      dateRange: { start: startDate, end: endDate },
      source: 'no_database',
    };
  }

  // Query email_events for step-level breakdown
  let stepQuery = supabaseAdmin
    .from('email_events')
    .select('step, event_ts, contact_email')
    .eq('workspace_id', workspaceId)
    .eq('event_type', 'sent')
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`);

  // Apply campaign filter OR global exclusion
  if (campaign) {
    stepQuery = stepQuery.eq('campaign_name', campaign);
  } else {
    // Exclude test campaigns globally
    for (const excludedCampaign of EXCLUDED_CAMPAIGNS) {
      stepQuery = stepQuery.neq('campaign_name', excludedCampaign);
    }
  }

  const { data: eventsData, error: eventsError } = await stepQuery;

  if (eventsError) {
    console.error('Step breakdown query error:', eventsError);
    throw eventsError;
  }

  // Aggregate by step and track unique contacts for Email 1
  const stepMap = new Map<number, { count: number; lastSent: string | null }>();
  const dailyMap = new Map<string, number>();
  const email1Recipients = new Set<string>(); // Track unique Email 1 recipients

  for (const event of eventsData || []) {
    const step = event.step || 1;
    const current = stepMap.get(step) || { count: 0, lastSent: null };
    current.count++;
    if (!current.lastSent || event.event_ts > current.lastSent) {
      current.lastSent = event.event_ts;
    }
    stepMap.set(step, current);

    // Track unique contacts who received Email 1 (step 1)
    if (step === 1 && event.contact_email) {
      email1Recipients.add(event.contact_email.toLowerCase());
    }

    // Aggregate daily
    const day = event.event_ts.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  }

  const stepNames = {
    1: 'Email 1 (Initial Outreach)',
    2: 'Email 2 (Follow-up)',
    3: 'Email 3 (Final Follow-up)',
  };

  const steps: StepBreakdown[] = [1, 2, 3].map(step => ({
    step,
    name: stepNames[step as 1 | 2 | 3],
    sends: stepMap.get(step)?.count || 0,
    lastSentAt: stepMap.get(step)?.lastSent || undefined,
  }));

  // Build daily sends with all days in range
  const dailySends: DailySend[] = [];
  const startD = new Date(startDate);
  const endD = new Date(endDate);

  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    dailySends.push({
      date: dateStr,
      count: dailyMap.get(dateStr) || 0,
    });
  }

  const totalSends = steps.reduce((sum, s) => sum + s.sends, 0);
  const uniqueContacts = email1Recipients.size;

  // Query total leads count from leads_ohio table
  let totalLeads = 0;
  try {
    const { count, error: countError } = await supabaseAdmin
      .from('leads_ohio')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);
    
    if (!countError && count !== null) {
      totalLeads = count;
    }
  } catch (e) {
    console.error('Error fetching leads count:', e);
  }

  return {
    steps,
    dailySends,
    totalSends,
    uniqueContacts, // This is the "Contacts Reached" value (Email 1 unique recipients)
    totalLeads, // Total leads in database for % calculation
    dateRange: {
      start: startDate,
      end: endDate,
    },
    source: 'supabase',
  };
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`step-breakdown:${clientId}`, RATE_LIMIT_READ);

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
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Workspace access validation (SECURITY: Prevents unauthorized data access)
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) {
    return accessError;
  }

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // Require Supabase
  if (!supabaseAdmin) {
    console.error('Supabase not configured');
    return NextResponse.json({
      steps: [],
      dailySends: [],
      totalSends: 0,
      uniqueContacts: 0,
      totalLeads: 0,
      dateRange: { start: startDate, end: endDate },
      source: 'no_database',
    } as StepBreakdownResponse, { headers: API_HEADERS });
  }

  try {
    // Generate cache key
    const cacheKey = apiCacheKey('step-breakdown', {
      start: startDate,
      end: endDate,
      campaign: campaign || undefined,
      workspace: workspaceId,
    });

    // Use cache with 30 second TTL
    const data = await cacheManager.getOrSet(
      cacheKey,
      () => fetchStepBreakdownData(startDate, endDate, workspaceId, campaign),
      CACHE_TTL.SHORT
    );

    return NextResponse.json(data, { headers: API_HEADERS });
  } catch (error) {
    console.error('Step breakdown API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: API_HEADERS });
  }
}
