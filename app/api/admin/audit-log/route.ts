/**
 * PHASE 34.3 - Audit Log API
 * 
 * GET /api/admin/audit-log
 * 
 * Returns role change audit entries.
 * - Super Admins can view all entries
 * - Workspace Owners can filter by workspaceId
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWorkspaceAccess, isSuperAdmin } from '@/lib/workspace-access';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`admin-audit:${clientId}`, RATE_LIMIT_READ);
  
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

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500, headers: API_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  // Build query
  let query = supabaseAdmin
    .from('role_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Filter by workspace if provided
  if (workspaceId) {
    // Owners can view their workspace's audit log
    const access = await getWorkspaceAccess(userId, workspaceId);
    if (!access || access.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owners can view audit logs' },
        { status: 403, headers: API_HEADERS }
      );
    }
    query = query.eq('workspace_id', workspaceId);
  } else if (!isSuperAdmin(userId)) {
    // Non-super-admins must specify a workspace
    return NextResponse.json(
      { error: 'workspaceId query parameter is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  const { data: entries, error } = await query;

  if (error) {
    console.error('Audit log fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500, headers: API_HEADERS }
    );
  }

  return NextResponse.json({
    entries: entries || [],
    count: entries?.length || 0,
  }, { headers: API_HEADERS });
}
