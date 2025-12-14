/**
 * PHASE 30 - PILLAR 3: DRACONIAN ACCESS GATE
 * 
 * Strict role-based access control with explicit owner/admin/member/viewer hierarchy.
 * Admins are UNTRUSTED for key management operations.
 * 
 * Security Properties:
 * - Uniform error responses (prevent enumeration)
 * - Role-based caching (5-minute TTL)
 * - Super Admin bypass with audit trail
 * - Type-safe exhaustive role checks
 * 
 * Handles multi-tenant authorization:
 * - Which workspaces can a user access?
 * - What role does a user have in a workspace?
 * - Is a user a super-admin (can see all)?
 */

import { supabaseAdmin } from './supabase';
import { auth, currentUser } from '@clerk/nextjs/server';

// ============================================
// TYPES
// ============================================

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceAccess {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canManageKeys: boolean;  // CRITICAL: Only owners can manage API keys
  canDelete: boolean;
}

export interface UserWorkspaceAccess {
  userId: string;
  isSuperAdmin: boolean;
  workspaces: WorkspaceAccess[];
  currentWorkspace: WorkspaceAccess | null;
}

// ============================================
// ROLE PERMISSIONS
// ============================================

const ROLE_PERMISSIONS: Record<WorkspaceRole, {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canManageKeys: boolean;  // CRITICAL: Only owners can manage API keys
  canDelete: boolean;
}> = {
  owner: { canRead: true, canWrite: true, canManage: true, canManageKeys: true, canDelete: true },
  admin: { canRead: true, canWrite: true, canManage: true, canManageKeys: false, canDelete: false }, // ADMINS UNTRUSTED
  member: { canRead: true, canWrite: true, canManage: false, canManageKeys: false, canDelete: false },
  viewer: { canRead: true, canWrite: false, canManage: false, canManageKeys: false, canDelete: false },
};

// Super admin user IDs (can access all workspaces)
const SUPER_ADMIN_IDS: string[] = [
  'user_36QtXCPqQu6k0CXcYM0Sn2OQsgT', // Nishchith - Owner
];

// ============================================
// ACCESS CACHE (5-minute TTL)
// ============================================

interface CacheEntry {
  role: WorkspaceRole;
  timestamp: number;
}

const accessCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, workspaceId: string): string {
  return `${userId}:${workspaceId}`;
}

function getCachedRole(userId: string, workspaceId: string): WorkspaceRole | null {
  const key = getCacheKey(userId, workspaceId);
  const entry = accessCache.get(key);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    accessCache.delete(key);
    return null;
  }
  
  return entry.role;
}

function setCachedRole(userId: string, workspaceId: string, role: WorkspaceRole): void {
  const key = getCacheKey(userId, workspaceId);
  accessCache.set(key, { role, timestamp: Date.now() });
  
  // Probabilistic cache cleanup (10% chance)
  if (Math.random() < 0.1) {
    cleanupCache();
  }
}

function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of accessCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      accessCache.delete(key);
    }
  }
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log access decisions for audit trail (JSON-formatted for structured logging)
 */
function logAccessDecision(
  event: string,
  userId: string,
  workspaceId: string,
  hasAccess: boolean,
  role?: WorkspaceRole
): void {
  const logEntry = {
    event,
    userId,
    workspaceId,
    hasAccess,
    role,
    timestamp: new Date().toISOString(),
  };
  
  console.log(JSON.stringify(logEntry));
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check if a user is a super admin
 */
export function isSuperAdmin(userId: string): boolean {
  return SUPER_ADMIN_IDS.includes(userId);
}

/**
 * Get workspace access for a user (with caching and audit logging)
 */
export async function getWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<WorkspaceAccess | null> {
  if (!supabaseAdmin) return null;

  // Super admins have owner access to everything
  if (isSuperAdmin(userId)) {
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('id, name')
      .eq('id', workspaceId)
      .single();

    if (!workspace) return null;

    logAccessDecision('super_admin_access', userId, workspaceId, true, 'owner');

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role: 'owner',
      ...ROLE_PERMISSIONS.owner,
    };
  }

  // Check cache first
  const cachedRole = getCachedRole(userId, workspaceId);
  if (cachedRole) {
    return {
      workspaceId,
      workspaceName: '', // Not cached, but access is valid
      role: cachedRole,
      ...ROLE_PERMISSIONS[cachedRole],
    };
  }

  // Check user_workspaces table
  const { data, error } = await supabaseAdmin
    .from('user_workspaces')
    .select(`
      role,
      workspaces (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    logAccessDecision('workspace_access_denied', userId, workspaceId, false);
    return null;
  }

  const workspace = data.workspaces as unknown as { id: string; name: string };
  const role = data.role as WorkspaceRole;

  // Cache the role
  setCachedRole(userId, workspaceId, role);
  logAccessDecision('workspace_access_granted', userId, workspaceId, true, role);

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    role,
    ...ROLE_PERMISSIONS[role],
  };
}

/**
 * Get all workspaces a user can access
 */
export async function getUserWorkspaces(userId: string): Promise<WorkspaceAccess[]> {
  if (!supabaseAdmin) return [];

  // Super admins can see all workspaces
  if (isSuperAdmin(userId)) {
    const { data: workspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id, name')
      .order('name');

    return (workspaces || []).map(ws => ({
      workspaceId: ws.id,
      workspaceName: ws.name,
      role: 'owner' as WorkspaceRole,
      ...ROLE_PERMISSIONS.owner,
    }));
  }

  // Regular users - check user_workspaces
  const { data, error } = await supabaseAdmin
    .from('user_workspaces')
    .select(`
      role,
      workspaces (
        id,
        name
      )
    `)
    .eq('user_id', userId);

  if (error || !data) return [];

  return data
    .filter(d => d.workspaces)
    .map(d => {
      const workspace = d.workspaces as unknown as { id: string; name: string };
      const role = d.role as WorkspaceRole;
      return {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        role,
        ...ROLE_PERMISSIONS[role],
      };
    });
}

/**
 * Check if user can access a workspace
 */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  if (isSuperAdmin(userId)) return true;
  const access = await getWorkspaceAccess(userId, workspaceId);
  return access !== null;
}

/**
 * Check if user can write to a workspace
 */
export async function canWriteToWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  if (isSuperAdmin(userId)) return true;
  const access = await getWorkspaceAccess(userId, workspaceId);
  return access?.canWrite ?? false;
}

/**
 * Check if user can manage a workspace (invite users, change settings)
 */
export async function canManageWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  if (isSuperAdmin(userId)) return true;
  const access = await getWorkspaceAccess(userId, workspaceId);
  return access?.canManage ?? false;
}

/**
 * Require workspace access with specific permission
 * Throws if user lacks permission (uniform error message)
 * 
 * @throws {Error} If user lacks required permission
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  permission: keyof WorkspaceAccess
): Promise<WorkspaceAccess> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const access = await getWorkspaceAccess(userId, workspaceId);
  if (!access) {
    throw new Error('Access denied'); // Uniform error
  }

  // Check the specific permission
  if (!access[permission]) {
    throw new Error('Access denied'); // Uniform error
  }

  return access;
}

// ============================================
// WORKSPACE MANAGEMENT
// ============================================

/**
 * Create a new workspace
 */
export async function createWorkspace(
  userId: string,
  name: string,
  slug?: string
): Promise<{ workspace: { id: string; name: string; slug: string } | null; error: string | null }> {
  if (!supabaseAdmin) {
    return { workspace: null, error: 'Database not configured' };
  }

  // Generate slug from name if not provided
  const baseSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  try {
    // Try to create workspace; if slug conflict, append a short suffix and retry
    let workspaceSlug = baseSlug || 'workspace';
    let workspace = null;
    let wsError = null as any;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name,
          slug: workspaceSlug,
          plan: 'free',
          settings: {},
        })
        .select()
        .single();

      if (!error) {
        workspace = data;
        wsError = null;
        break;
      }

      // If slug unique constraint violated, retry with a suffix
      if (error.code === '23505') {
        const suffix = Math.random().toString(36).slice(2, 6);
        workspaceSlug = `${baseSlug || 'workspace'}-${suffix}`;
        wsError = error;
        continue;
      }

      // Other errors -> stop
      wsError = error;
      break;
    }

    if (wsError) {
      console.error('Workspace creation error:', wsError);
      return { workspace: null, error: wsError.message };
    }

    // Add user as owner
    const { error: memberError } = await supabaseAdmin
      .from('user_workspaces')
      .insert({
        user_id: userId,
        workspace_id: workspace.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('User workspace mapping error:', memberError);
      // Rollback workspace creation
      await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id);
      return { workspace: null, error: memberError.message };
    }

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
      error: null,
    };
  } catch (err) {
    console.error('Create workspace error:', err);
    return { workspace: null, error: 'Failed to create workspace' };
  }
}

/**
 * Add a user to a workspace
 */
export async function addUserToWorkspace(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = 'member'
): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_workspaces')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        role,
      }, { onConflict: 'user_id,workspace_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Add user to workspace error:', err);
    return { success: false, error: 'Failed to add user to workspace' };
  }
}

/**
 * Remove a user from a workspace
 */
export async function removeUserFromWorkspace(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_workspaces')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Remove user from workspace error:', err);
    return { success: false, error: 'Failed to remove user from workspace' };
  }
}

/**
 * Update user's role in a workspace
 */
export async function updateUserRole(
  workspaceId: string,
  userId: string,
  newRole: WorkspaceRole
): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_workspaces')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Update user role error:', err);
    return { success: false, error: 'Failed to update user role' };
  }
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<{
  members: Array<{ userId: string; role: WorkspaceRole }>;
  error: string | null;
}> {
  if (!supabaseAdmin) {
    return { members: [], error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_workspaces')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    if (error) {
      return { members: [], error: error.message };
    }

    return {
      members: (data || []).map(d => ({
        userId: d.user_id,
        role: d.role as WorkspaceRole,
      })),
      error: null,
    };
  } catch (err) {
    console.error('Get workspace members error:', err);
    return { members: [], error: 'Failed to get workspace members' };
  }
}

// ============================================
// SERVER-SIDE AUTH HELPERS
// ============================================

/**
 * Get current user's workspace access (server-side)
 * Use this in API routes and server components
 */
export async function getCurrentUserAccess(requestedWorkspaceId?: string): Promise<{
  userId: string | null;
  access: WorkspaceAccess | null;
  allWorkspaces: WorkspaceAccess[];
  isSuperAdmin: boolean;
  error: string | null;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        userId: null,
        access: null,
        allWorkspaces: [],
        isSuperAdmin: false,
        error: 'Not authenticated',
      };
    }

    const isAdmin = isSuperAdmin(userId);
    const workspaces = await getUserWorkspaces(userId);

    // If no workspace specified, use first available
    const targetWorkspaceId = requestedWorkspaceId || workspaces[0]?.workspaceId || 'default';
    
    // Get access for requested workspace
    const access = await getWorkspaceAccess(userId, targetWorkspaceId);

    return {
      userId,
      access,
      allWorkspaces: workspaces,
      isSuperAdmin: isAdmin,
      error: access ? null : 'No access to requested workspace',
    };
  } catch (err) {
    console.error('getCurrentUserAccess error:', err);
    return {
      userId: null,
      access: null,
      allWorkspaces: [],
      isSuperAdmin: false,
      error: 'Failed to check access',
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  ROLE_PERMISSIONS,
  SUPER_ADMIN_IDS,
};

