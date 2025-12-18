/**
 * Workspace API
 * 
 * PATCH /api/workspaces/[workspaceId]
 * 
 * Updates a workspace's details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

function jsonResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const { workspaceId } = params;

  // 1. Check database configuration
  if (!supabaseAdmin) {
    return jsonResponse({ success: false, error: 'Database not configured' }, 503);
  }

  // 2. Authenticate user
  const { userId } = await auth();
  if (!userId) {
    return jsonResponse({ success: false, error: 'Authentication required' }, 401);
  }

  // 3. Parse request
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { name } = body;
  
  if (!name) {
    return jsonResponse({ success: true, message: 'No changes provided' });
  }

  // 4. Verify authorization (Owner or Admin)
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('user_workspaces')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (membershipError || !membership) {
    return jsonResponse({ success: false, error: 'Access denied' }, 403);
  }

  const allowedRoles = ['owner', 'admin'];
  if (!allowedRoles.includes(membership.role)) {
    return jsonResponse({ success: false, error: 'Only admins can rename workspaces' }, 403);
  }

  // 5. Update workspace
  const { data: updatedWorkspace, error: updateError } = await supabaseAdmin
    .from('workspaces')
    .update({ 
      name, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', workspaceId)
    .select()
    .single();

  if (updateError) {
    console.error('Workspace update error:', updateError);
    return jsonResponse({ success: false, error: 'Failed to update workspace' }, 500);
  }

  return jsonResponse({
    success: true,
    workspace: updatedWorkspace
  });
}
