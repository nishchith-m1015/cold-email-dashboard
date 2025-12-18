/**
 * Campaign Update API
 * 
 * PATCH /api/campaigns/[id]
 * 
 * Updates a campaign's details (name, description).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// HELPERS
// ============================================

function jsonResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ============================================
// PATCH HANDLER
// ============================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // 1. Check database configuration
  if (!supabaseAdmin) {
    return jsonResponse({ success: false, error: 'Database not configured' }, 503);
  }

  // 2. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  // 3. Parse and validate request body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { name, description } = body;
  
  // Only allow updating name and description via this endpoint
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ success: true, message: 'No changes provided' });
  }

  updates.updated_at = new Date().toISOString();

  // 4. Fetch campaign to verify ownership/access
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('workspace_id')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return jsonResponse({ success: false, error: 'Campaign not found' }, 404);
  }

  // 5. Verify workspace authorization
  const { data: membership } = await supabaseAdmin
    .from('user_workspaces')
    .select('role')
    .eq('workspace_id', campaign.workspace_id)
    .eq('user_id', userId)
    .single();

  const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
  if (!membership && campaign.workspace_id !== DEFAULT_WORKSPACE_ID) {
    return jsonResponse(
      { success: false, error: 'Not authorized to modify this campaign' },
      403
    );
  }

  // 6. Update campaign
  const { data: updatedCampaign, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId)
    .select()
    .single();

  if (updateError) {
    console.error('Campaign update error:', updateError);
    return jsonResponse({ success: false, error: 'Failed to update campaign' }, 500);
  }

  return jsonResponse({
    success: true,
    campaign: updatedCampaign
  });
}
