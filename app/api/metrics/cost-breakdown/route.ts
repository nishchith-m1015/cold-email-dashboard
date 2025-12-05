import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { API_HEADERS } from '@/lib/utils';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`cost-breakdown:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Check if Supabase is configured
  if (!supabaseAdmin) {
    return NextResponse.json({
      total: { cost_usd: 0, tokens_in: 0, tokens_out: 0, calls: 0 },
      by_provider: [],
      by_model: [],
      daily: [],
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    }, { headers: API_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const campaign = searchParams.get('campaign');
  const provider = searchParams.get('provider'); // NEW: Provider filter
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Default to last 30 days
  const startDate = start || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const endDate = end || new Date().toISOString().slice(0, 10);

  try {
    // Query LLM usage
    let query = supabaseAdmin
      .from('llm_usage')
      .select('provider, model, tokens_in, tokens_out, cost_usd, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (campaign) {
      query = query.eq('campaign_name', campaign);
    }

    // NEW: Filter by provider if specified
    if (provider && provider !== 'all') {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Cost breakdown query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate by provider
    const providerMap = new Map<string, { 
      cost_usd: number; 
      tokens_in: number; 
      tokens_out: number; 
      calls: number;
    }>();

    // Aggregate by model
    const modelMap = new Map<string, { 
      cost_usd: number; 
      tokens_in: number; 
      tokens_out: number; 
      calls: number;
      provider: string;
    }>();

    // Daily costs for timeseries
    const dailyCosts = new Map<string, number>();

    for (const row of data || []) {
      const provider = row.provider || 'unknown';
      const model = row.model || 'unknown';
      const cost = Number(row.cost_usd) || 0;
      const tokensIn = row.tokens_in || 0;
      const tokensOut = row.tokens_out || 0;
      const day = row.created_at?.slice(0, 10) || 'unknown';

      // Aggregate by provider
      const existingProvider = providerMap.get(provider) || { 
        cost_usd: 0, 
        tokens_in: 0, 
        tokens_out: 0, 
        calls: 0 
      };
      providerMap.set(provider, {
        cost_usd: existingProvider.cost_usd + cost,
        tokens_in: existingProvider.tokens_in + tokensIn,
        tokens_out: existingProvider.tokens_out + tokensOut,
        calls: existingProvider.calls + 1,
      });

      // Aggregate by model
      const modelKey = `${provider}:${model}`;
      const existingModel = modelMap.get(modelKey) || { 
        cost_usd: 0, 
        tokens_in: 0, 
        tokens_out: 0, 
        calls: 0,
        provider,
      };
      modelMap.set(modelKey, {
        ...existingModel,
        cost_usd: existingModel.cost_usd + cost,
        tokens_in: existingModel.tokens_in + tokensIn,
        tokens_out: existingModel.tokens_out + tokensOut,
        calls: existingModel.calls + 1,
      });

      // Daily costs
      const existingDaily = dailyCosts.get(day) || 0;
      dailyCosts.set(day, existingDaily + cost);
    }

    // Build response
    const byProvider = Array.from(providerMap.entries())
      .map(([provider, stats]) => ({
        provider,
        cost_usd: Number(stats.cost_usd.toFixed(2)),
        tokens_in: stats.tokens_in,
        tokens_out: stats.tokens_out,
        calls: stats.calls,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd);

    const byModel = Array.from(modelMap.entries())
      .map(([key, stats]) => ({
        model: key.split(':')[1],
        provider: stats.provider,
        cost_usd: Number(stats.cost_usd.toFixed(2)),
        tokens_in: stats.tokens_in,
        tokens_out: stats.tokens_out,
        calls: stats.calls,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd);

    const dailyTimeseries = Array.from(dailyCosts.entries())
      .map(([day, cost]) => ({ day, value: Number(cost.toFixed(2)) }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const totalCost = byProvider.reduce((sum, p) => sum + p.cost_usd, 0);
    const totalTokensIn = byProvider.reduce((sum, p) => sum + p.tokens_in, 0);
    const totalTokensOut = byProvider.reduce((sum, p) => sum + p.tokens_out, 0);
    const totalCalls = byProvider.reduce((sum, p) => sum + p.calls, 0);

    return NextResponse.json({
      total: {
        cost_usd: Number(totalCost.toFixed(2)),
        tokens_in: totalTokensIn,
        tokens_out: totalTokensOut,
        calls: totalCalls,
      },
      by_provider: byProvider,
      by_model: byModel,
      daily: dailyTimeseries,
      start_date: startDate,
      end_date: endDate,
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Cost breakdown API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

