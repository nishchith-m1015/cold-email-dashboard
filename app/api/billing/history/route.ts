import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/history
 * 
 * Returns historical usage data for billing/invoicing purposes.
 * 
 * Query params:
 * - workspace_id: string (defaults to DEFAULT_WORKSPACE_ID)
 * - months: number (how many months of history, defaults to 6)
 * 
 * Returns array of monthly usage records.
 */
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ history: [] }, { headers: API_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;
  const monthsParam = searchParams.get('months');
  const monthsCount = monthsParam ? parseInt(monthsParam, 10) : 6;

  try {
    const history = [];
    const now = new Date();

    for (let i = 0; i < monthsCount; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0);
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // Fetch email counts
      const { count: emailsSent } = await supabaseAdmin
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('event_type', 'sent')
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDateStr}T23:59:59Z`);

      const { count: replies } = await supabaseAdmin
        .from('email_events')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('event_type', 'replied')
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDateStr}T23:59:59Z`);

      // Fetch LLM costs
      const { data: llmData } = await supabaseAdmin
        .from('llm_usage')
        .select('cost_usd')
        .eq('workspace_id', workspaceId)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDateStr}T23:59:59Z`);

      const llmCostUsd = llmData?.reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0) || 0;

      history.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        month_name: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        emails_sent: emailsSent || 0,
        replies: replies || 0,
        llm_cost_usd: Number(llmCostUsd.toFixed(4)),
        api_calls: llmData?.length || 0,
      });
    }

    return NextResponse.json({ 
      workspace_id: workspaceId,
      history,
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Billing history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

