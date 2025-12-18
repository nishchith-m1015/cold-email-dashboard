/**
 * PHASE 34.5 - Workspace Access API
 * 
 * GET /api/workspaces/[workspaceId]/access
 * 
 * Returns the current user's access level for the specified workspace.
 * Used by usePermissions hook for UI guards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWorkspaceAccess } from '@/lib/workspace-access';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { workspaceId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-access:${clientId}`, RATE_LIMIT_READ);
  
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

  // Get access level
  const access = await getWorkspaceAccess(userId, workspaceId);

  if (!access) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403, headers: API_HEADERS }
    );
  }

  return NextResponse.json({
    workspaceId: access.workspaceId,
    workspaceName: access.workspaceName,
    role: access.role,
    canRead: access.canRead,
    canWrite: access.canWrite,
    canManage: access.canManage,
    canManageKeys: access.canManageKeys,
    canDelete: access.canDelete,
  }, { headers: API_HEADERS });
}
