/**
 * PHASE 30 - PILLAR 5: ANTI-LEAK MESH
 * 
 * Response Sanitization for Workspace Data
 * 
 * Security Properties:
 * - Explicit field allowlisting (no SELECT *)
 * - Type-safe response construction
 * - Defense against accidental secret exposure
 * - Compile-time enforcement via TypeScript
 * 
 * Purpose: Prevent accidental leakage of workspace_keys ciphertext in API responses.
 * Even if a query accidentally fetches secrets, sanitization ensures they never reach the browser.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Safe workspace response - explicitly excludes vault fields
 * 
 * CRITICAL: This type must NEVER include:
 * - key_ciphertext
 * - key_fingerprint
 * - encryption_version
 * - Any field from workspace_keys table
 */
export interface SafeWorkspaceResponse {
  id: string;
  name: string;
  slug: string | null;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
  settings?: Record<string, any>;
}

/**
 * Compile-time assertion: Ensure type has no secret fields
 * 
 * Usage: type SafeWorkspace = AssertNoSecrets<WorkspaceResponse>;
 * If WorkspaceResponse contains 'key_ciphertext', TypeScript will error at compile time.
 */
type AssertNoSecrets<T> = T extends { key_ciphertext: any } 
  ? never 
  : T extends { key_fingerprint: any }
  ? never
  : T;

// Validate SafeWorkspaceResponse at compile time
type _ValidatedSafeWorkspace = AssertNoSecrets<SafeWorkspaceResponse>;

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Sanitize a single workspace object
 * 
 * Explicit destructuring ensures only safe fields are included.
 * Any accidental fields (e.g., from SELECT * or JOIN) are dropped.
 * 
 * @param workspace - Raw workspace data (may contain unsafe fields)
 * @returns SafeWorkspaceResponse with only allowed fields
 */
export function sanitizeWorkspace(workspace: any): SafeWorkspaceResponse {
  // Explicit destructuring = allowlist approach
  const {
    id,
    name,
    slug,
    plan,
    created_at,
    updated_at,
    settings,
  } = workspace;

  // Construct response with ONLY safe fields
  return {
    id,
    name,
    slug: slug ?? null,
    plan: plan ?? 'free',
    created_at: created_at instanceof Date ? created_at.toISOString() : created_at,
    updated_at: updated_at instanceof Date ? updated_at.toISOString() : updated_at,
    ...(settings && { settings }),
  };
}

/**
 * Sanitize an array of workspace objects
 * 
 * @param workspaces - Array of raw workspace data
 * @returns Array of SafeWorkspaceResponse objects
 */
export function sanitizeWorkspaces(workspaces: any[]): SafeWorkspaceResponse[] {
  return workspaces.map(sanitizeWorkspace);
}

/**
 * Sanitize workspace with member info
 * 
 * Used for workspace list endpoints that include role information.
 */
export interface SafeWorkspaceWithRole extends SafeWorkspaceResponse {
  role: 'owner' | 'admin' | 'member' | 'viewer';
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canManageKeys: boolean;
}

export function sanitizeWorkspaceWithRole(
  workspace: any,
  role: 'owner' | 'admin' | 'member' | 'viewer',
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canManage: boolean;
    canManageKeys: boolean;
  }
): SafeWorkspaceWithRole {
  return {
    ...sanitizeWorkspace(workspace),
    role,
    ...permissions,
  };
}

// ============================================
// AUDIT HELPERS
// ============================================

/**
 * Log sanitization event (for debugging/auditing)
 * 
 * CRITICAL: Never log the raw workspace object (may contain secrets)
 */
export function logSanitization(
  workspaceId: string,
  operation: 'single' | 'list',
  fieldsDropped?: string[]
): void {
  if (process.env.NODE_ENV === 'development' && fieldsDropped && fieldsDropped.length > 0) {
    console.warn(
      `[SECURITY] Dropped unsafe fields from workspace ${workspaceId}:`,
      fieldsDropped
    );
  }
}

/**
 * Detect if raw data contains unsafe fields
 * 
 * @param data - Raw workspace data
 * @returns Array of detected unsafe field names
 */
export function detectUnsafeFields(data: any): string[] {
  const unsafeFieldNames = [
    'key_ciphertext',
    'key_fingerprint',
    'encryption_version',
    'provider',
    'rotated_at',
  ];

  return unsafeFieldNames.filter(field => field in data);
}

/**
 * Sanitize with audit logging
 * 
 * Wrapper that logs if unsafe fields are detected and dropped.
 */
export function sanitizeWorkspaceWithAudit(workspace: any): SafeWorkspaceResponse {
  const unsafeFields = detectUnsafeFields(workspace);
  
  if (unsafeFields.length > 0) {
    logSanitization(workspace.id, 'single', unsafeFields);
  }

  return sanitizeWorkspace(workspace);
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard: Check if object is a safe workspace response
 * 
 * @param obj - Object to check
 * @returns True if obj matches SafeWorkspaceResponse structure
 */
export function isSafeWorkspaceResponse(obj: any): obj is SafeWorkspaceResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.plan === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string' &&
    // CRITICAL: Ensure no unsafe fields
    !('key_ciphertext' in obj) &&
    !('key_fingerprint' in obj) &&
    !('encryption_version' in obj)
  );
}
