import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ, RATE_LIMIT_STRICT } from '@/lib/rate-limit';
import { 
  getUserWorkspaces, 
  createWorkspace, 
  isSuperAdmin,
  addUserToWorkspace,
} from '@/lib/workspace-access';
import { auth } from '@clerk/nextjs/server';
import { sanitizeWorkspace, sanitizeWorkspaceWithRole } from '@/lib/response-sanitizer';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

/**
 * GET /api/workspaces
 * 
 * Fetch workspaces for the authenticated user.
 * Returns all workspaces the user has access to.
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

  // If no Supabase, return default workspace
  if (!supabaseAdmin) {
    return NextResponse.json({
      workspaces: [{
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default Workspace',
        slug: 'default',
        plan: 'free',
        role: 'owner',
      }],
      current: {
        id: DEFAULT_WORKSPACE_ID,
        name: 'Default Workspace',
        slug: 'default',
        plan: 'free',
        role: 'owner',
      },
      isSuperAdmin: false,
    }, { headers: API_HEADERS });
  }

  try {
    // Get authenticated user
    const { userId } = await auth();
    
    // Also support query param for backward compatibility
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('user_id');
    
    const effectiveUserId = userId || queryUserId;

    // If no user ID, return default workspace only
    if (!effectiveUserId) {
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
        isSuperAdmin: false,
      }, { headers: API_HEADERS });
    }

    // Get user's workspaces using access control library
    const workspaces = await getUserWorkspaces(effectiveUserId);
    const isAdmin = isSuperAdmin(effectiveUserId);

    // If user has no workspaces, return empty list with onboarding flag
    // User must join a team or create their own workspace
    if (workspaces.length === 0) {
      // Super admins automatically get added to default workspace
      if (isAdmin) {
        await addUserToWorkspace(DEFAULT_WORKSPACE_ID, effectiveUserId, 'owner');
        
        const { data: defaultWs } = await supabaseAdmin
          .from('workspaces')
          .select('id, name, slug, plan')
          .eq('id', DEFAULT_WORKSPACE_ID)
          .single();

        return NextResponse.json({
          workspaces: [{
            id: DEFAULT_WORKSPACE_ID,
            name: defaultWs?.name || 'Ohio Campaign',
            slug: defaultWs?.slug || 'ohio',
            plan: defaultWs?.plan || 'pro',
            role: 'owner',
          }],
          current: {
            id: DEFAULT_WORKSPACE_ID,
            name: defaultWs?.name || 'Ohio Campaign',
            slug: defaultWs?.slug || 'ohio',
            plan: defaultWs?.plan || 'pro',
            role: 'owner',
          },
          isSuperAdmin: true,
          needsOnboarding: false,
        }, { headers: API_HEADERS });
      }

      // Regular users need to join or create a workspace
      return NextResponse.json({
        workspaces: [],
        current: null,
        isSuperAdmin: false,
        needsOnboarding: true,
      }, { headers: API_HEADERS });
    }

    // Enrich workspace data with full info from workspaces table
    const workspaceIds = workspaces.map(w => w.workspaceId);
    const { data: wsDetails } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, slug, plan, settings, created_at, updated_at')
      .in('id', workspaceIds);

    const enrichedWorkspaces = workspaces.map(wa => {
      const details = wsDetails?.find(d => d.id === wa.workspaceId);
      // PILLAR 5: Sanitize workspace response to prevent secret leakage
      return sanitizeWorkspaceWithRole(
        {
          id: wa.workspaceId,
          name: details?.name || wa.workspaceName,
          slug: details?.slug || wa.workspaceId,
          plan: details?.plan || 'free',
          settings: details?.settings || {},
          created_at: details?.created_at,
          updated_at: details?.updated_at,
        },
        wa.role,
        {
          canRead: wa.canRead,
          canWrite: wa.canWrite,
          canManage: wa.canManage,
          canManageKeys: wa.canManageKeys,
        }
      );
    });

    return NextResponse.json({
      workspaces: enrichedWorkspaces,
      current: enrichedWorkspaces[0] || null,
      isSuperAdmin: isAdmin,
    }, { headers: API_HEADERS });
  } catch (error) {
    console.error('Workspaces API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      workspaces: [],
      current: null,
      isSuperAdmin: false,
    }, { status: 500, headers: API_HEADERS });
  }
}

/**
 * POST /api/workspaces
 * 
 * Create a new workspace.
 * Body: { name: string, slug?: string }
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspaces-create:${clientId}`, RATE_LIMIT_STRICT);
  
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

  // Require Supabase
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { name, slug } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Workspace name must be at least 2 characters' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Create workspace
    const { workspace, error } = await createWorkspace(userId, name.trim(), slug);

    if (error || !workspace) {
      return NextResponse.json(
        { error: error || 'Failed to create workspace' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // PILLAR 5: Sanitize workspace response
    const safeWorkspace = sanitizeWorkspace({
      ...workspace,
      plan: 'free',
    });

    return NextResponse.json({
      success: true,
      workspace: {
        ...safeWorkspace,
        role: 'owner',
      },
      message: `Workspace "${workspace.name}" created successfully`,
    }, { status: 201, headers: API_HEADERS });
  } catch (error) {
    console.error('Create workspace error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}

