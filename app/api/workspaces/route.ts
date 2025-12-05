import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

/**
 * GET /api/workspaces
 * 
 * Fetch workspaces for a user.
 * Query params:
 * - user_id: Clerk user ID (optional - returns default workspace if not provided)
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspaces:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');

  // If no Supabase, return default workspace
  if (!supabaseAdmin) {
    return NextResponse.json({
      workspaces: [{
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default Workspace',
        slug: 'default',
        plan: 'free',
      }],
      current: {
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default Workspace',
        slug: 'default',
        plan: 'free',
      },
    }, { headers: API_HEADERS });
  }

  try {
    // If no user ID provided, return default workspace only
    if (!userId) {
      const { data: defaultWs, error } = await supabaseAdmin
        .from('workspaces')
        .select('id, name, slug, plan, settings')
        .eq('id', DEFAULT_WORKSPACE_ID)
        .single();

      if (error) {
        console.error('Default workspace fetch error:', error);
        return NextResponse.json({
          workspaces: [{
            id: DEFAULT_WORKSPACE_ID,
            name: 'Default Workspace',
            slug: 'default',
            plan: 'free',
          }],
          current: null,
        }, { headers: API_HEADERS });
      }

      return NextResponse.json({
        workspaces: [defaultWs],
        current: defaultWs,
      }, { headers: API_HEADERS });
    }

    // Fetch user's workspaces via user_workspaces table
    const { data: userWorkspaces, error: uwError } = await supabaseAdmin
      .from('user_workspaces')
      .select(`
        workspace_id,
        role,
        workspaces (
          id,
          name,
          slug,
          plan,
          settings
        )
      `)
      .eq('user_id', userId);

    if (uwError) {
      console.error('User workspaces fetch error:', uwError);
      // Fallback to default
      return NextResponse.json({
        workspaces: [{
          id: DEFAULT_WORKSPACE_ID,
          name: 'Default Workspace',
          slug: 'default',
          plan: 'free',
        }],
        current: null,
      }, { headers: API_HEADERS });
    }

    // If user has no workspaces, auto-create a mapping to default
    if (!userWorkspaces || userWorkspaces.length === 0) {
      // Auto-create user_workspace mapping
      await supabaseAdmin
        .from('user_workspaces')
        .upsert({
          user_id: userId,
          workspace_id: DEFAULT_WORKSPACE_ID,
          role: 'owner',
        }, { onConflict: 'user_id,workspace_id' });

      // Return default workspace
      const { data: defaultWs } = await supabaseAdmin
        .from('workspaces')
        .select('id, name, slug, plan, settings')
        .eq('id', DEFAULT_WORKSPACE_ID)
        .single();

      return NextResponse.json({
        workspaces: [defaultWs || {
          id: DEFAULT_WORKSPACE_ID,
          name: 'Default Workspace',
          slug: 'default',
          plan: 'free',
        }],
        current: defaultWs || {
          id: DEFAULT_WORKSPACE_ID,
          name: 'Default Workspace',
          slug: 'default',
          plan: 'free',
        },
      }, { headers: API_HEADERS });
    }

    // Transform to workspace list with roles
    const workspaces = userWorkspaces
      .map(uw => {
        const ws = uw.workspaces as unknown as {
          id: string;
          name: string;
          slug: string;
          plan: string;
          settings: Record<string, unknown>;
        };
        return ws ? {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          plan: ws.plan,
          settings: ws.settings,
          role: uw.role,
        } : null;
      })
      .filter(Boolean);

    // Determine current workspace (first one or from localStorage on client)
    const current = workspaces[0] || null;

    return NextResponse.json({
      workspaces,
      current,
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Workspaces API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      workspaces: [],
      current: null,
    }, { status: 500, headers: API_HEADERS });
  }
}

/**
 * POST /api/workspaces
 * 
 * Create a new workspace (future - requires auth)
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspaces-create:${clientId}`, { limit: 10, windowSec: 60 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // For now, return not implemented
  return NextResponse.json(
    { error: 'Workspace creation not yet implemented' },
    { status: 501, headers: API_HEADERS }
  );
}

