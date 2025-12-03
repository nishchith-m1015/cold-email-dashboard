import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { calculateLlmCost } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if Supabase is configured
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify webhook token
  const token = req.headers.get('x-webhook-token');
  if (!token || token !== process.env.DASH_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    workspace_id,
    campaign,
    contact_email,
    provider,
    model,
    tokens_in,
    tokens_out,
    cost_usd,
    purpose,
    metadata,
  } = body;

  // Validate required fields
  if (!provider || !model) {
    return NextResponse.json({ error: 'Missing required fields: provider, model' }, { status: 400 });
  }

  const workspaceId = workspace_id || DEFAULT_WORKSPACE_ID;
  const campaignName = campaign || null;
  const tokensIn = tokens_in || 0;
  const tokensOut = tokens_out || 0;
  
  // Calculate cost if not provided
  const finalCost = cost_usd ?? calculateLlmCost(provider, model, tokensIn, tokensOut);

  try {
    // Insert LLM usage record
    const { error } = await supabaseAdmin
      .from('llm_usage')
      .insert({
        workspace_id: workspaceId,
        campaign_name: campaignName,
        contact_email: contact_email || null,
        provider,
        model,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: finalCost,
        purpose: purpose || null,
        metadata: metadata || {},
      });

    if (error) {
      console.error('LLM usage insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      cost_usd: finalCost,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
  } catch (error) {
    console.error('LLM usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'llm-usage' });
}

