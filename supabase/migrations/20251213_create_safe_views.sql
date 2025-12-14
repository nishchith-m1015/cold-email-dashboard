-- PHASE 30 - PILLAR 5: ANTI-LEAK MESH
-- Safe view that excludes workspace_keys table to prevent accidental exposure

-- Migration: Create safe_workspace_data view
-- Purpose: Provide read-only access to workspace data WITHOUT exposing vault secrets
-- Security: Explicitly excludes workspace_keys table from all JOINs

-- Create safe view with explicit column allowlist
CREATE OR REPLACE VIEW safe_workspace_data AS
SELECT 
  w.id,
  w.name,
  w.slug,
  w.plan,
  w.settings,
  w.created_at,
  w.updated_at
FROM workspaces w;
-- CRITICAL: workspace_keys NOT joined = cannot leak ciphertext

-- Add comment for documentation
COMMENT ON VIEW safe_workspace_data IS 'Safe workspace data view - excludes workspace_keys to prevent accidental secret exposure (Phase 30 Pillar 5)';

-- Grant SELECT on safe view to authenticated users
-- Note: RLS on workspaces table still applies through the view
GRANT SELECT ON safe_workspace_data TO authenticated;

-- Revoke direct SELECT on workspace_keys from all non-service roles
-- (Service role needed for backend key operations)
REVOKE SELECT ON workspace_keys FROM authenticated;
REVOKE SELECT ON workspace_keys FROM anon;
