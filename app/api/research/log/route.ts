import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ResearchLogRequest {
  contact_email: string;
  campaign_name?: string;
  search_query: string;
  raw_results: Record<string, unknown>;  // CSE JSON response
  summary: string;                        // O3-mini summary
  sources_count: number;
  workflow_run_id?: string;
  lead_id?: number;
  workspace_id?: string;
}

interface ResearchLogResponse {
  success: boolean;
  log_id: string;
  quality_score: number;
}

/**
 * Calculate quality score based on sources and summary length
 * Scale: 1-10
 */
function calculateQualityScore(sourcesCount: number, summaryLength: number): number {
  // Sources score: 0-3 sources = 1-5, 4-6 sources = 6-8, 7+ sources = 9-10
  let sourcesScore = Math.min(10, Math.floor((sourcesCount / 2) * 3) + 1);
  
  // Summary score: <100 chars = 1-3, 100-300 = 4-7, 300+ = 8-10
  let summaryScore = summaryLength < 100 ? 3 : summaryLength < 300 ? 6 : 9;
  
  // Weighted average: 60% sources, 40% summary
  const qualityScore = Math.round(sourcesScore * 0.6 + summaryScore * 0.4);
  
  return Math.max(1, Math.min(10, qualityScore));
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook token
    const token = req.headers.get('x-webhook-token');
    const expectedToken = process.env.DASH_WEBHOOK_TOKEN;
    
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body: ResearchLogRequest = await req.json();

    // Validate required fields
    if (!body.contact_email || !body.search_query || !body.summary) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contact_email, search_query, summary' },
        { status: 400 }
      );
    }

    const workspaceId = body.workspace_id || DEFAULT_WORKSPACE_ID;
    const qualityScore = calculateQualityScore(
      body.sources_count || 0,
      body.summary?.length || 0
    );

    // Insert research log
    const { data, error } = await supabaseAdmin
      .from('research_logs')
      .insert({
        workspace_id: workspaceId,
        contact_email: body.contact_email,
        campaign_name: body.campaign_name || null,
        search_query: body.search_query,
        raw_results: body.raw_results || {},
        summary: body.summary,
        quality_score: qualityScore,
        sources_count: body.sources_count || 0,
        lead_id: body.lead_id || null,
        workflow_run_id: body.workflow_run_id || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting research log:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to log research data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      log_id: data.id,
      quality_score: qualityScore,
    } as ResearchLogResponse);

  } catch (error) {
    console.error('Research log API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/research/log?contact_email=...&limit=10
 * Fetch research logs for a contact (for auditing/debugging)
 */
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const contactEmail = searchParams.get('contact_email');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

    let query = supabaseAdmin
      .from('research_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (contactEmail) {
      query = query.eq('contact_email', contactEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching research logs:', error);
      return NextResponse.json({ error: 'Failed to fetch research logs' }, { status: 500 });
    }

    return NextResponse.json({ logs: data });

  } catch (error) {
    console.error('Research log GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

