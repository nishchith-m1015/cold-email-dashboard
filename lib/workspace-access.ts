/**
 * Workspace Access Control Library
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
  canDelete: boolean;
}> = {
  owner: { canRead: true, canWrite: true, canManage: true, canDelete: true },
  admin: { canRead: true, canWrite: true, canManage: true, canDelete: false },
  member: { canRead: true, canWrite: true, canManage: false, canDelete: false },
  viewer: { canRead: true, canWrite: false, canManage: false, canDelete: false },
};

// Super admin user IDs (can access all workspaces)
const SUPER_ADMIN_IDS: string[] = [
  'user_36QtXCPqQu6k0CXcYM0Sn2OQsgT', // Nishchith - Owner
];

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
 * Get workspace access for a user
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

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role: 'owner',
      ...ROLE_PERMISSIONS.owner,
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

  if (error || !data) return null;

  const workspace = data.workspaces as unknown as { id: string; name: string };
  const role = data.role as WorkspaceRole;

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
  const workspaceSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Generate unique ID
  const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Create workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        id: workspaceId,
        name,
        slug: workspaceSlug,
        plan: 'free',
        settings: {},
      })
      .select()
      .single();

    if (wsError) {
      console.error('Workspace creation error:', wsError);
      return { workspace: null, error: wsError.message };
    }

    // Add user as owner
    const { error: memberError } = await supabaseAdmin
      .from('user_workspaces')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        role: 'owner',
      });

    if (memberError) {
      console.error('User workspace mapping error:', memberError);
      // Rollback workspace creation
      await supabaseAdmin.from('workspaces').delete().eq('id', workspaceId);
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

