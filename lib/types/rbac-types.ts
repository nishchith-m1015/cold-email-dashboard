/**
 * PHASE 34 - RBAC TYPES
 * 
 * Type definitions for workspace member management and role-based access control.
 */

import { WorkspaceRole } from '@/lib/workspace-access';

/**
 * Workspace member with Clerk user data merged
 */
export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: WorkspaceRole;
  joinedAt: string;
  isCurrentUser: boolean;
  isOrphan?: boolean;
}

/**
 * API response for members list
 */
export interface MembersAPIResponse {
  members: WorkspaceMember[];
  totalCount: number;
  currentUserRole: WorkspaceRole;
}

/**
 * Payload for role change requests
 */
export interface RoleChangePayload {
  newRole: WorkspaceRole;
}

/**
 * API response for role change
 */
export interface RoleChangeResponse {
  success: boolean;
  newRole?: WorkspaceRole;
  error?: string;
}
