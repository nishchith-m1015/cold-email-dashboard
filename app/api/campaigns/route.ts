import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { EXCLUDED_CAMPAIGNS, shouldExcludeCampaign } from '@/lib/db-queries';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check if Supabase is configured
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  // Workspace access validation (SECURITY: Prevents unauthorized data access)
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) {
    return accessError;
  }

  try {
    // Query campaigns table with n8n integration fields
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, description, status, n8n_workflow_id, n8n_status, last_sync_at, version, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Campaigns query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { campaigns: campaigns || [] },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Campaigns API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

