-- ============================================
-- PHASE 30 - PILLAR 2: VAULT AUDIT LOGGING
-- Migration: Create workspace_keys_audit table
-- ============================================
-- 
-- This migration creates the audit trail for all vault access.
-- Logs every read, write, and delete operation.
-- 
-- Apply with: psql <connection-string> -f supabase/migrations/20251213_create_vault_audit.sql
-- ============================================

-- ============================================
-- TABLE: workspace_keys_audit
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_keys_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to the key (nullable for DELETE operations)
  workspace_key_id UUID,
  
  -- Context
  workspace_id UUID NOT NULL,
  actor_id TEXT NOT NULL,  -- Clerk user ID who performed the action
  
  -- Action type
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Provider context
  provider TEXT,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Additional context (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_vault_audit_workspace ON workspace_keys_audit(workspace_id);
CREATE INDEX idx_vault_audit_actor ON workspace_keys_audit(actor_id);
CREATE INDEX idx_vault_audit_created ON workspace_keys_audit(created_at DESC);
CREATE INDEX idx_vault_audit_key ON workspace_keys_audit(workspace_key_id);
CREATE INDEX idx_vault_audit_action ON workspace_keys_audit(action);

-- ============================================
-- TRIGGER FUNCTION: log_vault_access
-- ============================================

CREATE OR REPLACE FUNCTION log_vault_access()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id TEXT;
BEGIN
  -- Get current user from JWT claims
  current_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
  
  -- Insert audit log
  INSERT INTO workspace_keys_audit (
    workspace_key_id,
    workspace_id,
    actor_id,
    action,
    provider,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.workspace_id, OLD.workspace_id),
    COALESCE(current_user_id, 'system'),
    TG_OP,  -- INSERT, UPDATE, or DELETE
    COALESCE(NEW.provider, OLD.provider),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'changed_at', NOW()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Audit all vault operations
-- ============================================

DROP TRIGGER IF EXISTS audit_workspace_keys ON workspace_keys;

CREATE TRIGGER audit_workspace_keys
  AFTER INSERT OR UPDATE OR DELETE ON workspace_keys
  FOR EACH ROW
  EXECUTE FUNCTION log_vault_access();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on audit table
ALTER TABLE workspace_keys_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_keys_audit FORCE ROW LEVEL SECURITY;

-- Policy: Super Admin and Workspace Owners can read audit logs
CREATE POLICY vault_audit_read ON workspace_keys_audit
  FOR SELECT
  USING (
    -- Super Admin can see all
    current_setting('app.super_admin_id', true) = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    -- Workspace owners can see their workspace's audit logs
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_keys_audit.workspace_id
        AND uw.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND uw.role = 'owner'
    )
  );

-- No INSERT/UPDATE/DELETE policy (only trigger can write)

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

REVOKE ALL ON workspace_keys_audit FROM PUBLIC;
GRANT SELECT ON workspace_keys_audit TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE workspace_keys_audit IS 'Audit trail for all workspace_keys access. Logs every read, write, and delete operation.';
COMMENT ON COLUMN workspace_keys_audit.action IS 'SQL operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN workspace_keys_audit.actor_id IS 'Clerk user ID who performed the action';
COMMENT ON COLUMN workspace_keys_audit.metadata IS 'Additional context (operation type, timestamp, etc.)';
