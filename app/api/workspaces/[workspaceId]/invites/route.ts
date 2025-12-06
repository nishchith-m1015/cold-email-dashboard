import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canManageWorkspace, WorkspaceRole } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/[workspaceId]/invites
 * List all invite codes for a workspace (admin only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { workspaceId } = params;

    // Check if user can manage this workspace
    const canManage = await canManageWorkspace(userId, workspaceId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to manage invites for this workspace' },
        { status: 403 }
      );
    }

    // Get all invites for this workspace
    const { data: invites, error } = await supabaseAdmin
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch invites error:', error);
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
    }

    return NextResponse.json({
      invites: invites || [],
    });
  } catch (error) {
    console.error('Get invites error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/workspaces/[workspaceId]/invites
 * Create a new invite code (admin only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { workspaceId } = params;

    // Check if user can manage this workspace
    const canManage = await canManageWorkspace(userId, workspaceId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to create invites for this workspace' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      role = 'member', 
      uses = null, // null = unlimited
      expiresInDays = null // null = never expires
    } = body;

    // Validate role
    const validRoles: WorkspaceRole[] = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, member, or viewer' },
        { status: 400 }
      );
    }

    // Generate unique invite code
    const code = generateInviteCode();

    // Calculate expiration
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create invite
    const { data: invite, error } = await supabaseAdmin
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        code,
        created_by: userId,
        role,
        uses_remaining: uses,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Create invite error:', error);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        code: invite.code,
        role: invite.role,
        usesRemaining: invite.uses_remaining,
        expiresAt: invite.expires_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/invites
 * Revoke an invite code (admin only)
 * Body: { inviteId: string }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { workspaceId } = params;

    // Check if user can manage this workspace
    const canManage = await canManageWorkspace(userId, workspaceId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'You do not have permission to delete invites for this workspace' },
        { status: 403 }
      );
    }

    const { inviteId } = await req.json();

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
    }

    // Delete invite
    const { error } = await supabaseAdmin
      .from('workspace_invites')
      .delete()
      .eq('id', inviteId)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('Delete invite error:', error);
      return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate a unique invite code
 * Format: TEAM-XXXXXX (6 chars)
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars (0, O, I, L, 1)
  let code = 'TEAM-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

