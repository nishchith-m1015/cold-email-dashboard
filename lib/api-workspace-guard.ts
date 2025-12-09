/**
 * API Workspace Access Guard
 * 
 * Validates that a user has access to a workspace before allowing API operations.
 * Uses in-memory caching to avoid repeated database queries.
 */

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Super admin users who can access all workspaces
const SUPER_ADMIN_IDS = ['user_36QtXCPqQu6k0CXcYM0Sn2OQsgT'];

// In-memory cache for workspace access (5 minute TTL)
interface CacheEntry {
  hasAccess: boolean;
  timestamp: number;
  role?: string;
}

const accessCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of accessCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      accessCache.delete(key);
    }
  }
}

/**
 * Check if a user has access to a workspace
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string
): Promise<{ hasAccess: boolean; role?: string }> {
  // Super admin bypass
  if (SUPER_ADMIN_IDS.includes(userId)) {
    return { hasAccess: true, role: 'super_admin' };
  }

  // Check cache
  const cacheKey = `${userId}:${workspaceId}`;
  const cached = accessCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { hasAccess: cached.hasAccess, role: cached.role };
  }

  // Clear expired entries periodically
  if (Math.random() < 0.1) {
    clearExpiredCache();
  }

  // Query database
  const { data, error } = await supabase
    .from('user_workspaces')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  const hasAccess = !error && !!data;
  const role = data?.role;
  
  // Cache result
  accessCache.set(cacheKey, {
    hasAccess,
    role,
    timestamp: Date.now(),
  });

  return { hasAccess, role };
}

/**
 * Extract workspace ID from request
 */
export function extractWorkspaceId(
  request: Request,
  searchParams?: URLSearchParams
): string | null {
  // Try query parameter
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('workspace_id') || searchParams?.get('workspace_id');
  
  if (fromQuery) {
    return fromQuery;
  }

  // Try header
  const headers = new Headers(request.headers);
  const fromHeader = headers.get('x-workspace-id');
  
  if (fromHeader) {
    return fromHeader;
  }

  return null;
}

/**
 * Validate workspace access and return error response if unauthorized
 * Returns null if access is granted
 */
export async function validateWorkspaceAccess(
  request: Request,
  searchParams?: URLSearchParams
): Promise<NextResponse | null> {
  // Get authenticated user
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  // Extract workspace ID
  const workspaceId = extractWorkspaceId(request, searchParams);
  
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400 }
    );
  }

  // Validate access
  const { hasAccess, role } = await canAccessWorkspace(userId, workspaceId);
  
  if (!hasAccess) {
    return NextResponse.json(
      { 
        error: 'Access denied to this workspace',
        workspace_id: workspaceId 
      },
      { status: 403 }
    );
  }

  // Access granted - return null to indicate success
  return null;
}

/**
 * Get user's default workspace
 */
export async function getUserDefaultWorkspace(userId: string): Promise<string | null> {
  // Super admin gets 'default' workspace
  if (SUPER_ADMIN_IDS.includes(userId)) {
    return 'default';
  }

  const { data, error } = await supabase
    .from('user_workspaces')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.workspace_id;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string): Promise<
  Array<{
    workspace_id: string;
    role: string;
    workspace_name?: string;
  }>
> {
  const { data, error } = await supabase
    .from('user_workspaces')
    .select(`
      workspace_id,
      role,
      workspaces (
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    workspace_id: row.workspace_id,
    role: row.role,
    workspace_name: row.workspaces?.name,
  }));
}

/**
 * Clear cache for a specific user-workspace combination
 */
export function clearWorkspaceCache(userId: string, workspaceId: string) {
  const cacheKey = `${userId}:${workspaceId}`;
  accessCache.delete(cacheKey);
}

/**
 * Clear all cache entries for a user
 */
export function clearUserCache(userId: string) {
  for (const key of accessCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      accessCache.delete(key);
    }
  }
}

