import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { LLM_PRICING, calculateLlmCost } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// Cost event schema from n8n
interface CostEventPayload {
  workspace_id?: string;
  campaign_name?: string;
  contact_email?: string;
  provider: string;
  model: string;
  tokens_in?: number;
  tokens_out?: number;
  raw_usage?: number;
  cost_usd?: number;
  purpose?: string;
  workflow_id?: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
}

// Validate webhook token
function validateToken(req: NextRequest): boolean {
  const token = req.headers.get('x-webhook-token');
  const expectedToken = process.env.DASH_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    console.warn('DASH_WEBHOOK_TOKEN not configured - allowing all requests');
    return true;
  }
  
  return token === expectedToken;
}

// POST /api/cost-events - Receive cost events from n8n
export async function POST(req: NextRequest) {
  // Validate token
  if (!validateToken(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - invalid or missing X-Webhook-Token' },
      { status: 401 }
    );
  }

  // Check Supabase
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json() as CostEventPayload | CostEventPayload[];
    
    // Handle both single event and batch
    const events = Array.isArray(body) ? body : [body];
    
    const results = [];
    const errors = [];

    for (const event of events) {
      try {
        // Validate required fields
        if (!event.provider || !event.model) {
          errors.push({
            event,
            error: 'Missing required fields: provider, model',
          });
          continue;
        }

        // Calculate cost if not provided
        let costUsd = event.cost_usd;
        if (costUsd === undefined && event.tokens_in !== undefined && event.tokens_out !== undefined) {
          costUsd = calculateLlmCost(
            event.provider,
            event.model,
            event.tokens_in,
            event.tokens_out
          );
        }

        // If still no cost and we have raw_usage, try to estimate
        if (costUsd === undefined && event.raw_usage !== undefined) {
          // For non-token APIs (Apify, etc.), just store raw_usage
          costUsd = 0; // Will need manual cost mapping or config
        }

        // Default to 0 if we can't calculate
        if (costUsd === undefined) {
          costUsd = 0;
        }

        // Insert into llm_usage table
        const { data, error } = await supabaseAdmin
          .from('llm_usage')
          .insert({
            workspace_id: event.workspace_id || DEFAULT_WORKSPACE_ID,
            campaign_name: event.campaign_name || null,
            contact_email: event.contact_email || null,
            provider: event.provider,
            model: event.model,
            tokens_in: event.tokens_in || 0,
            tokens_out: event.tokens_out || 0,
            cost_usd: costUsd,
            purpose: event.purpose || null,
            metadata: {
              workflow_id: event.workflow_id,
              run_id: event.run_id,
              raw_usage: event.raw_usage,
              ...event.metadata,
            },
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          errors.push({ event, error: error.message });
        } else {
          results.push({
            id: data.id,
            provider: event.provider,
            model: event.model,
            cost_usd: costUsd,
          });
        }
      } catch (err) {
        errors.push({ event, error: String(err) });
      }
    }

    // Return results
    const status = errors.length > 0 && results.length === 0 ? 400 : 200;
    return NextResponse.json(
      {
        success: results.length > 0,
        inserted: results.length,
        errors: errors.length,
        results,
        error_details: errors.length > 0 ? errors : undefined,
      },
      { status }
    );
  } catch (error) {
    console.error('Cost events API error:', error);
    return NextResponse.json(
      { error: 'Invalid JSON payload', details: String(error) },
      { status: 400 }
    );
  }
}

// GET /api/cost-events - Get recent cost events (for debugging)
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ events: [], error: 'Database not configured' });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  try {
    const { data, error } = await supabaseAdmin
      .from('llm_usage')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: data,
      count: data.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

