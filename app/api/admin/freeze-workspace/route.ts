import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Super Admin IDs - should be in env vars
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

/**
 * POST /api/admin/freeze-workspace
 * 
 * Freeze a workspace (Kill Switch).
 * Blocks all API access for the tenant.
 * Super Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const body = await req.json();
    const { workspace_id, reason } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get workspace info for audit
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, status')
      .eq('id', workspace_id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    if (workspace.status === 'frozen') {
      return NextResponse.json(
        { error: 'Workspace is already frozen' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get actor email for audit
    const clerk = await clerkClient();
    const actor = await clerk.users.getUser(userId);
    const actorEmail = actor.emailAddresses?.[0]?.emailAddress || 'unknown';

    // Freeze the workspace
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        status: 'frozen',
        frozen_at: new Date().toISOString(),
        frozen_by: userId,
        freeze_reason: reason || 'No reason provided',
      })
      .eq('id', workspace_id);

    if (updateError) {
      /* eslint-disable-next-line no-console */
      console.error('[Kill Switch] Failed to freeze workspace:', updateError);
      return NextResponse.json(
        { error: 'Failed to freeze workspace' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Revoke all workspace API keys
    await supabase
      .from('workspace_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .is('revoked_at', null);

    // Log to governance audit
    await supabase.from('governance_audit_log').insert({
      workspace_id,
      workspace_name: workspace.name,
      actor_id: userId,
      actor_email: actorEmail,
      action: 'freeze',
      reason: reason || 'No reason provided',
      metadata: { previous_status: workspace.status },
    });

    /* eslint-disable-next-line no-console */
    console.log(`[Kill Switch] Workspace "${workspace.name}" frozen by ${actorEmail}`);

    return NextResponse.json({
      success: true,
      message: `Workspace "${workspace.name}" has been frozen`,
      workspace_id,
    }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Kill Switch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * DELETE /api/admin/freeze-workspace
 * 
 * Unfreeze a workspace.
 * Restores normal operation.
 * Super Admin only.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspace_id = searchParams.get('workspace_id');

    if (!workspace_id) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get workspace info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, status')
      .eq('id', workspace_id)
      .single();

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404, headers: API_HEADERS }
      );
    }

    if (workspace.status !== 'frozen') {
      return NextResponse.json(
        { error: 'Workspace is not frozen' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Get actor email for audit
    const clerk = await clerkClient();
    const actor = await clerk.users.getUser(userId);
    const actorEmail = actor.emailAddresses?.[0]?.emailAddress || 'unknown';

    // Unfreeze the workspace
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        status: 'active',
        frozen_at: null,
        frozen_by: null,
        freeze_reason: null,
      })
      .eq('id', workspace_id);

    if (updateError) {
      /* eslint-disable-next-line no-console */
      console.error('[Kill Switch] Failed to unfreeze workspace:', updateError);
      return NextResponse.json(
        { error: 'Failed to unfreeze workspace' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Log to governance audit
    await supabase.from('governance_audit_log').insert({
      workspace_id,
      workspace_name: workspace.name,
      actor_id: userId,
      actor_email: actorEmail,
      action: 'unfreeze',
      reason: 'Workspace restored to active status',
      metadata: { previous_status: 'frozen' },
    });

    /* eslint-disable-next-line no-console */
    console.log(`[Kill Switch] Workspace "${workspace.name}" unfrozen by ${actorEmail}`);

    return NextResponse.json({
      success: true,
      message: `Workspace "${workspace.name}" has been unfrozen`,
      workspace_id,
    }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Kill Switch] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
