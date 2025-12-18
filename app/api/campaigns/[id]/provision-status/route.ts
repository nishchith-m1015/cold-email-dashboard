/**
 * PHASE 33 - Provisioning Status API
 * 
 * GET /api/campaigns/[campaignId]/provision-status
 * 
 * Returns the current provisioning status for a campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getWorkspaceAccess } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { campaignId } = await params;

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  // Get campaign to check workspace access
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('workspace_id, provision_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: 'Campaign not found' },
      { status: 404, headers: API_HEADERS }
    );
  }

  // Check workspace read access
  const access = await getWorkspaceAccess(userId, campaign.workspace_id);
  if (!access?.canRead) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403, headers: API_HEADERS }
    );
  }

  // Get provisioning status
  const { data: steps, error: statusError } = await supabaseAdmin
    .from('provisioning_status')
    .select('step, status, error, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (statusError) {
    console.error('Status fetch error:', statusError);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500, headers: API_HEADERS }
    );
  }

  // Determine if provisioning is complete
  const allDone = steps?.every(s => s.status === 'done') ?? false;
  const hasError = steps?.some(s => s.status === 'error') ?? false;

  return NextResponse.json({
    campaignId,
    provisionId: campaign.provision_id,
    steps: steps || [],
    isComplete: allDone,
    hasError,
  }, { headers: API_HEADERS });
}
