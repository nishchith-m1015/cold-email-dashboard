/**
 * PHASE 34.4 - Super Admin: All Workspaces API
 * 
 * GET /api/admin/all-workspaces
 * 
 * Returns summary of all workspaces for Super Admin god view.
 * Only accessible to users in SUPER_ADMIN_IDS array.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isSuperAdmin } from '@/lib/workspace-access';
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
  const rateLimit = checkRateLimit(`admin-workspaces:${clientId}`, RATE_LIMIT_READ);
  
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

  // Super Admin check
  if (!isSuperAdmin(userId)) {
    return NextResponse.json(
      { error: 'Super Admin access required' },
      { status: 403, headers: API_HEADERS }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500, headers: API_HEADERS }
    );
  }

  // Fetch all workspaces with member counts
  const { data: workspaces, error } = await supabaseAdmin
    .from('workspaces')
    .select(`
      id,
      name,
      slug,
      plan,
      created_at,
      user_workspaces (
        user_id,
        role
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin workspaces fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500, headers: API_HEADERS }
    );
  }

  // Aggregate member counts and find owner
  const summary = (workspaces || []).map((ws) => {
    const members = ws.user_workspaces || [];
    const owner = members.find((m: { role: string }) => m.role === 'owner');

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      plan: ws.plan,
      memberCount: members.length,
      ownerUserId: owner?.user_id || null,
      createdAt: ws.created_at,
    };
  });

  return NextResponse.json({
    workspaces: summary,
    totalCount: summary.length,
  }, { headers: API_HEADERS });
}
