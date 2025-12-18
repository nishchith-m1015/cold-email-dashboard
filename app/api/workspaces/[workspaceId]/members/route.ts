import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ, RATE_LIMIT_STRICT } from '@/lib/rate-limit';
import { 
  getWorkspaceAccess, 
  getWorkspaceMembers, 
  addUserToWorkspace, 
  removeUserFromWorkspace,
  updateUserRole,
  WorkspaceRole,
} from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/members
 * 
 * Get all members of a workspace with enriched Clerk user data
 * PHASE 34 - Enhanced to include email, name, imageUrl from Clerk
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check access
  const access = await getWorkspaceAccess(userId, workspaceId);
  if (!access) {
    return NextResponse.json(
      { error: 'Access denied to this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  // Get members from Supabase
  const { members: memberRoles, error } = await getWorkspaceMembers(workspaceId);

  if (error) {
    return NextResponse.json(
      { error },
      { status: 500, headers: API_HEADERS }
    );
  }

  // Fetch Clerk user data for rich UI display
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const userIds = memberRoles.map(m => m.userId);
    
    if (userIds.length === 0) {
      return NextResponse.json({
        members: [],
        totalCount: 0,
        currentUserRole: access.role,
        canManage: access.canManage,
      }, { headers: API_HEADERS });
    }

    const clerkUsers = await clerkClient.users.getUserList({
      userId: userIds,
      limit: userIds.length,
    });

    // Merge Clerk data with roles
    const enrichedMembers = memberRoles.map(m => {
      const clerkUser = clerkUsers.data.find(u => u.id === m.userId);
      
      if (!clerkUser) {
        return {
          userId: m.userId,
          role: m.role,
          email: `ID: ${m.userId.slice(0, 12)}...`,
          name: 'Orphaned User',
          imageUrl: null,
          isCurrentUser: m.userId === userId,
          isOrphan: true,
        };
      }
      
      return {
        userId: m.userId,
        role: m.role,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || 'No email',
        name: clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.username || 'Unnamed User',
        imageUrl: clerkUser.imageUrl || null,
        isCurrentUser: m.userId === userId,
        isOrphan: false,
      };
    });

    return NextResponse.json({
      members: enrichedMembers,
      totalCount: enrichedMembers.length,
      currentUserRole: access.role,
      canManage: access.canManage,
    }, { headers: API_HEADERS });
  } catch (clerkError) {
    console.error('Clerk API error:', clerkError);
    // Fallback to basic data without Clerk enrichment
    return NextResponse.json({
      members: memberRoles.map(m => ({
        userId: m.userId,
        role: m.role,
        email: 'loading...',
        name: null,
        imageUrl: null,
        isCurrentUser: m.userId === userId,
      })),
      totalCount: memberRoles.length,
      currentUserRole: access.role,
      canManage: access.canManage,
    }, { headers: API_HEADERS });
  }
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * 
 * Add a member to the workspace
 * Body: { userId: string, role?: 'admin' | 'member' | 'viewer' }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members-add:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check management access
  const access = await getWorkspaceAccess(currentUserId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { userId: newUserId, role = 'member' } = body;

    if (!newUserId || typeof newUserId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Validate role
    const validRoles: WorkspaceRole[] = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, member, or viewer' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Add user
    const { success, error } = await addUserToWorkspace(workspaceId, newUserId, role);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to add member' },
        { status: 400, headers: API_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User added to workspace as ${role}`,
    }, { status: 201, headers: API_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}

/**
 * PATCH /api/workspaces/[workspaceId]/members
 * 
 * Update a member's role
 * Body: { userId: string, role: 'admin' | 'member' | 'viewer' }
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members-update:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check management access
  const access = await getWorkspaceAccess(currentUserId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { userId: targetUserId, role } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Validate role
    const validRoles: WorkspaceRole[] = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, member, or viewer' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // ------------------------------------------------------------------
    // PHASE 34 SECURE VALIDATION
    // ------------------------------------------------------------------
    
    // 1. Cannot change own role (must be done by another admin/owner)
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'You cannot change your own role. Ask another admin.' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // 2. Only Owners can promote someone to Owner
    if (role === 'owner' && access.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only Owners can promote members to Owner' },
        { status: 403, headers: API_HEADERS }
      );
    }
    
    // 3. Only Owners can demote/change an existing Owner
    const targetAccess = await getWorkspaceAccess(targetUserId, workspaceId);
    if (targetAccess?.role === 'owner' && access.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only Owners can manage other Owners' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // 4. Last Owner Protection: Cannot demote the last owner
    if (targetAccess?.role === 'owner' && role !== 'owner') {
      const { members } = await getWorkspaceMembers(workspaceId);
      const ownerCount = members.filter(m => m.role === 'owner').length;
      
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last owner of the workspace' },
          { status: 400, headers: API_HEADERS }
        );
      }
    }

    // Default: Admins can manage Members/Viewers (checked by getWorkspaceAccess above)

    // Update role
    const { success, error } = await updateUserRole(workspaceId, targetUserId, role);

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to update role' },
        { status: 400, headers: API_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
    }, { headers: API_HEADERS });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/members
 * 
 * Remove a member from the workspace
 * Query: ?userId=xxx
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-members-remove:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Require authentication
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  // Check management access
  const access = await getWorkspaceAccess(currentUserId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('userId');

  if (!targetUserId) {
    return NextResponse.json(
      { error: 'userId query parameter is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Can't remove owner
  const targetAccess = await getWorkspaceAccess(targetUserId, workspaceId);
  if (targetAccess?.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot remove workspace owner' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Remove user
  const { success, error } = await removeUserFromWorkspace(workspaceId, targetUserId);

  if (!success) {
    return NextResponse.json(
      { error: error || 'Failed to remove member' },
      { status: 400, headers: API_HEADERS }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'User removed from workspace',
  }, { headers: API_HEADERS });
}

