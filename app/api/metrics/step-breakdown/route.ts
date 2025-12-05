import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { fetchSheetData, calculateSheetStats } from '@/lib/google-sheets';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

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
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
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
  const source = searchParams.get('source');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const campaign = searchParams.get('campaign');

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  // If source=sheets or Supabase not configured, use Google Sheets
  if (source === 'sheets' || !supabaseAdmin) {
    try {
      const sheetName = campaign || 'Ohio';
      const sheetData = await fetchSheetData(sheetName);
      
      if (sheetData) {
        const stats = calculateSheetStats(sheetData);
        
        // Build step breakdown from sheet data
        const steps: StepBreakdown[] = [
          {
            step: 1,
            name: 'Email 1 (Initial Outreach)',
            sends: stats.email1Sends,
            lastSentAt: new Date().toISOString(),
          },
          {
            step: 2,
            name: 'Email 2 (Follow-up)',
            sends: stats.email2Sends,
            lastSentAt: stats.email2Sends > 0 ? new Date().toISOString() : undefined,
          },
          {
            step: 3,
            name: 'Email 3 (Final Follow-up)',
            sends: stats.email3Sends,
            lastSentAt: stats.email3Sends > 0 ? new Date().toISOString() : undefined,
          },
        ];

        // Simulate daily sends distribution based on total sends
        // This is a placeholder - in production, you'd track actual send dates
        const dailySends: DailySend[] = [];
        const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 3600 * 1000)) + 1;
        const avgSendsPerDay = Math.floor(stats.totalSends / totalDays);
        
        for (let i = 0; i < totalDays; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().slice(0, 10);
          
          // Distribute sends somewhat randomly but approximately evenly
          let count = avgSendsPerDay;
          if (i === totalDays - 1) {
            // Last day gets the remainder
            count = stats.totalSends - avgSendsPerDay * (totalDays - 1);
          }
          
          dailySends.push({ date: dateStr, count: Math.max(0, count) });
        }

        return NextResponse.json({
          steps,
          dailySends,
          totalSends: stats.totalSends,
          dateRange: {
            start: startDate,
            end: endDate,
          },
          source: 'google_sheets',
        } as StepBreakdownResponse, { headers: API_HEADERS });
      }
    } catch (error) {
      console.error('Google Sheets fetch error:', error);
    }

    // Fallback to empty if both fail
    if (!supabaseAdmin) {
      return NextResponse.json({
        steps: [],
        dailySends: [],
        totalSends: 0,
        dateRange: { start: startDate, end: endDate },
        source: 'none',
      } as StepBreakdownResponse, { headers: API_HEADERS });
    }
  }

  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  try {
    // Query email_events for step-level breakdown
    let stepQuery = supabaseAdmin
      .from('email_events')
      .select('step, event_ts')
      .eq('workspace_id', workspaceId)
      .eq('event_type', 'sent')
      .gte('event_ts', `${startDate}T00:00:00Z`)
      .lte('event_ts', `${endDate}T23:59:59Z`);

    if (campaign) {
      stepQuery = stepQuery.eq('campaign_name', campaign);
    }

    const { data: eventsData, error: eventsError } = await stepQuery;

    if (eventsError) {
      console.error('Step breakdown query error:', eventsError);
      return NextResponse.json({ error: eventsError.message }, { status: 500, headers: API_HEADERS });
    }

    // Aggregate by step
    const stepMap = new Map<number, { count: number; lastSent: string | null }>();
    const dailyMap = new Map<string, number>();

    for (const event of eventsData || []) {
      const step = event.step || 1;
      const current = stepMap.get(step) || { count: 0, lastSent: null };
      current.count++;
      if (!current.lastSent || event.event_ts > current.lastSent) {
        current.lastSent = event.event_ts;
      }
      stepMap.set(step, current);

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

    return NextResponse.json({
      steps,
      dailySends,
      totalSends,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      source: 'supabase',
    } as StepBreakdownResponse, { headers: API_HEADERS });
  } catch (error) {
    console.error('Step breakdown API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: API_HEADERS });
  }
}

