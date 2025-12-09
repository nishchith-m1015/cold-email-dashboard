import { supabaseAdmin } from './supabase';

export interface MetricsSummary {
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
  opens: number;
  clicks: number;
  reply_rate_pct: number;
  opt_out_rate_pct: number;
  cost_usd: number;
}

export interface CostBreakdown {
  total_cost: number;
  by_provider: Array<{
    provider: string;
    cost_usd: number;
    calls: number;
  }>;
  by_model: Array<{
    model: string;
    provider: string;
    cost_usd: number;
  }>;
}

export interface CampaignStat {
  campaign_name: string;
  sends: number;
  replies: number;
  reply_rate_pct: number;
}

export interface EmailEvent {
  contact_email: string;
  campaign_name: string;
  event_type: string;
  created_at: string;
}

export interface RAGContext {
  summary: MetricsSummary;
  costBreakdown: CostBreakdown;
  topCampaigns: CampaignStat[];
  recentEvents: EmailEvent[];
  dateRange: { start: string; end: string };
  totalLeads: number;
}

/**
 * Build RAG context for AI assistant
 * Fetches relevant data from the dashboard for the specified date range
 */
export async function buildRAGContext(
  workspaceId: string,
  startDate: string,
  endDate: string,
  campaign?: string
): Promise<RAGContext> {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  // Fetch summary metrics from email_events
  let eventsQuery = supabaseAdmin
    .from('email_events')
    .select('event_type, contact_email')
    .eq('workspace_id', workspaceId)
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`);

  if (campaign) {
    eventsQuery = eventsQuery.eq('campaign_name', campaign);
  }

  const { data: events } = await eventsQuery;

  const summary: MetricsSummary = {
    sends: events?.filter(e => e.event_type === 'sent').length || 0,
    replies: events?.filter(e => e.event_type === 'replied').length || 0,
    opt_outs: events?.filter(e => e.event_type === 'opt_out').length || 0,
    bounces: events?.filter(e => e.event_type === 'bounced').length || 0,
    opens: events?.filter(e => e.event_type === 'opened').length || 0,
    clicks: events?.filter(e => e.event_type === 'clicked').length || 0,
    reply_rate_pct: 0,
    opt_out_rate_pct: 0,
    cost_usd: 0,
  };

  if (summary.sends > 0) {
    summary.reply_rate_pct = Number(((summary.replies / summary.sends) * 100).toFixed(2));
    summary.opt_out_rate_pct = Number(((summary.opt_outs / summary.sends) * 100).toFixed(2));
  }

  // Fetch LLM cost data
  let costQuery = supabaseAdmin
    .from('llm_usage')
    .select('provider, model, cost_usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);

  if (campaign) {
    costQuery = costQuery.eq('campaign_name', campaign);
  }

  const { data: costs } = await costQuery;

  const totalCost = costs?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;
  summary.cost_usd = Number(totalCost.toFixed(2));

  // Group costs by provider
  const providerMap = new Map<string, { cost: number; calls: number }>();
  costs?.forEach(c => {
    const existing = providerMap.get(c.provider) || { cost: 0, calls: 0 };
    providerMap.set(c.provider, {
      cost: existing.cost + (c.cost_usd || 0),
      calls: existing.calls + 1,
    });
  });

  const costBreakdown: CostBreakdown = {
    total_cost: totalCost,
    by_provider: Array.from(providerMap.entries())
      .map(([provider, data]) => ({
        provider,
        cost_usd: Number(data.cost.toFixed(4)),
        calls: data.calls,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd),
    by_model: [],
  };

  // Group costs by model (top 5)
  const modelMap = new Map<string, { provider: string; cost: number }>();
  costs?.forEach(c => {
    const existing = modelMap.get(c.model) || { provider: c.provider, cost: 0 };
    modelMap.set(c.model, {
      provider: c.provider,
      cost: existing.cost + (c.cost_usd || 0),
    });
  });

  costBreakdown.by_model = Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      provider: data.provider,
      cost_usd: Number(data.cost.toFixed(4)),
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, 5);

  // Fetch top campaigns
  const { data: campaignEvents } = await supabaseAdmin
    .from('email_events')
    .select('campaign_name, event_type')
    .eq('workspace_id', workspaceId)
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`);

  const campaignStatsMap = new Map<string, { sends: number; replies: number }>();
  campaignEvents?.forEach(e => {
    const stats = campaignStatsMap.get(e.campaign_name) || { sends: 0, replies: 0 };
    if (e.event_type === 'sent') stats.sends++;
    if (e.event_type === 'replied') stats.replies++;
    campaignStatsMap.set(e.campaign_name, stats);
  });

  const topCampaigns: CampaignStat[] = Array.from(campaignStatsMap.entries())
    .map(([campaign_name, stats]) => ({
      campaign_name,
      sends: stats.sends,
      replies: stats.replies,
      reply_rate_pct: stats.sends > 0 ? Number(((stats.replies / stats.sends) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.sends - a.sends)
    .slice(0, 5);

  // Fetch recent events (last 10 replies or opt-outs)
  const { data: recentEvents } = await supabaseAdmin
    .from('email_events')
    .select('contact_email, campaign_name, event_type, created_at')
    .eq('workspace_id', workspaceId)
    .in('event_type', ['replied', 'opt_out'])
    .gte('event_ts', `${startDate}T00:00:00Z`)
    .lte('event_ts', `${endDate}T23:59:59Z`)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get total leads count
  const { count: totalLeads } = await supabaseAdmin
    .from('leads_ohio')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  return {
    summary,
    costBreakdown,
    topCampaigns,
    recentEvents: recentEvents || [],
    dateRange: { start: startDate, end: endDate },
    totalLeads: totalLeads || 0,
  };
}

/**
 * Format RAG context into a prompt for the AI
 */
export function formatContextForPrompt(context: RAGContext): string {
  const { summary, costBreakdown, topCampaigns, recentEvents, dateRange, totalLeads } = context;

  return `
Dashboard Data (${dateRange.start} to ${dateRange.end}):

## Summary Metrics
- Total Sends: ${summary.sends.toLocaleString()}
- Replies: ${summary.replies} (${summary.reply_rate_pct}% rate)
- Opt-outs: ${summary.opt_outs} (${summary.opt_out_rate_pct}% rate)
- Opens: ${summary.opens}
- Clicks: ${summary.clicks}
- Bounces: ${summary.bounces}
- Total LLM Cost: $${summary.cost_usd.toFixed(2)}
- Total Leads in Database: ${totalLeads.toLocaleString()}

## Cost Breakdown
${costBreakdown.by_provider.map(p => 
  `- ${p.provider}: $${p.cost_usd.toFixed(4)} (${p.calls} calls)`
).join('\n')}

## Top Campaigns
${topCampaigns.map(c => 
  `- ${c.campaign_name}: ${c.sends} sends, ${c.replies} replies (${c.reply_rate_pct}% rate)`
).join('\n')}

## Recent Activity
${recentEvents.slice(0, 5).map(e => 
  `- ${e.event_type === 'replied' ? '✅' : '🚫'} ${e.contact_email} (${e.campaign_name})`
).join('\n')}
`.trim();
}

