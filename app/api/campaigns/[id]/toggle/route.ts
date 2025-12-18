/**
 * Campaign Toggle API
 * 
 * Phase 31 Pillar 3: The Command Center
 * POST /api/campaigns/[id]/toggle
 * 
 * Activates or deactivates a campaign's linked n8n workflow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { toggleWorkflow, isN8nConfigured } from '@/lib/n8n-client';
import type { N8nStatus, CampaignStatus } from '@/lib/dashboard-types';

// ============================================
// TYPES
// ============================================

interface ToggleRequest {
  action: 'activate' | 'deactivate';
}

interface ToggleResponse {
  success: boolean;
  campaign?: {
    id: string;
    name: string;
    status: CampaignStatus;
    n8n_status: N8nStatus;
    version: number;
  };
  error?: string;
}

// ============================================
// HELPERS
// ============================================

function jsonResponse(data: ToggleResponse, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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
  let body: ToggleRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { action } = body;
  if (!action || !['activate', 'deactivate'].includes(action)) {
    return jsonResponse(
      { success: false, error: 'action must be "activate" or "deactivate"' },
      400
    );
  }

  // 4. Fetch campaign from database
  const { data: campaign, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return jsonResponse({ success: false, error: 'Campaign not found' }, 404);
  }

  // 5. Verify workspace authorization
  // Check if user has access to this workspace
  const { data: membership } = await supabaseAdmin
    .from('user_workspaces')
    .select('role')
    .eq('workspace_id', campaign.workspace_id)
    .eq('user_id', userId)
    .single();

  // Allow access if user is a member OR if workspace is the default workspace
  const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
  if (!membership && campaign.workspace_id !== DEFAULT_WORKSPACE_ID) {
    return jsonResponse(
      { success: false, error: 'Not authorized to modify this campaign' },
      403
    );
  }

  // 6. Check if campaign has linked n8n workflow
  if (!campaign.n8n_workflow_id) {
    return jsonResponse(
      { success: false, error: 'Campaign is not linked to an n8n workflow' },
      400
    );
  }

  // 7. Determine target n8n state
  const targetN8nState = action === 'activate' ? 'active' : 'inactive';

  // 8. Check if already in target state (idempotent)
  if (campaign.n8n_status === targetN8nState) {
    return jsonResponse({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        n8n_status: campaign.n8n_status,
        version: campaign.version,
      },
    });
  }

  // 9. Call n8n API if configured
  let newN8nStatus: N8nStatus = targetN8nState;

  if (isN8nConfigured()) {
    const n8nResult = await toggleWorkflow(campaign.n8n_workflow_id, targetN8nState);

    if (!n8nResult.success) {
      // Log error but don't fail - mark as error state
      console.error('n8n toggle failed:', n8nResult.error);
      newN8nStatus = 'error';
      
      return jsonResponse(
        { 
          success: false, 
          error: `n8n API error: ${n8nResult.error.message}` 
        },
        502
      );
    }

    newN8nStatus = n8nResult.data.active ? 'active' : 'inactive';
  } else {
    // n8n not configured - just update local state
    console.warn('n8n not configured, updating local status only');
  }

  // 10. Update campaign in database
  const newVersion = (campaign.version || 1) + 1;
  const newCampaignStatus: CampaignStatus = action === 'activate' ? 'active' : 'paused';

  const { data: updatedCampaign, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update({
      status: newCampaignStatus,
      n8n_status: newN8nStatus,
      last_sync_at: new Date().toISOString(),
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .eq('version', campaign.version) // Optimistic concurrency check
    .select()
    .single();

  if (updateError) {
    // Version mismatch or other error
    if (updateError.code === 'PGRST116') {
      return jsonResponse(
        { success: false, error: 'Campaign was modified by another request' },
        409
      );
    }
    console.error('Campaign update error:', updateError);
    return jsonResponse({ success: false, error: 'Failed to update campaign' }, 500);
  }

  // 11. Return success response
  return jsonResponse({
    success: true,
    campaign: {
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      status: updatedCampaign.status,
      n8n_status: updatedCampaign.n8n_status,
      version: updatedCampaign.version,
    },
  });
}
