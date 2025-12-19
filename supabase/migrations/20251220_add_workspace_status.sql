-- ============================================
-- PHASE 36.2: OBSERVABILITY & GOVERNANCE SUITE
-- Migration: Add workspace status for Kill Switch
-- ============================================
--
-- This migration adds status tracking to workspaces
-- for the "Freeze Tenant" / Kill Switch functionality.
--
-- Apply with: psql <connection-string> -f supabase/migrations/20251220_add_workspace_status.sql
-- ============================================
-- ============================================
-- ADD STATUS COLUMNS TO WORKSPACES
-- ============================================
-- Status column: active, suspended, frozen
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'frozen'));
-- Freeze metadata
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS frozen_by TEXT;
-- Clerk user ID of Super Admin
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS freeze_reason TEXT;
-- ============================================
-- INDEX FOR STATUS QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
-- ============================================
-- AUDIT TABLE FOR GOVERNANCE ACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS governance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Target workspace
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    workspace_name TEXT,
    -- Denormalized for historical reference
    -- Actor (Super Admin)
    actor_id TEXT NOT NULL,
    -- Clerk user ID
    actor_email TEXT,
    -- Denormalized for display
    -- Action details
    action TEXT NOT NULL CHECK (
        action IN (
            'freeze',
            'unfreeze',
            'suspend',
            'activate',
            'delete'
        )
    ),
    reason TEXT,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================
-- INDEXES FOR AUDIT LOG
-- ============================================
CREATE INDEX IF NOT EXISTS idx_governance_audit_workspace ON governance_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_actor ON governance_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_action ON governance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_governance_audit_created ON governance_audit_log(created_at DESC);
-- ============================================
-- RLS FOR GOVERNANCE AUDIT LOG
-- ============================================
ALTER TABLE governance_audit_log ENABLE ROW LEVEL SECURITY;
-- Only Super Admins can read governance logs
-- (We check via app.super_admin_ids setting or direct ID check)
CREATE POLICY governance_audit_read ON governance_audit_log FOR
SELECT USING (
        current_setting('request.jwt.claims', true)::json->>'sub' = ANY(
            string_to_array(
                current_setting('app.super_admin_ids', true),
                ','
            )
        )
    );
-- Only authenticated can insert (via API with Super Admin check)
CREATE POLICY governance_audit_insert ON governance_audit_log FOR
INSERT WITH CHECK (true);
-- API handles authorization
-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON governance_audit_log TO authenticated;
GRANT INSERT ON governance_audit_log TO authenticated;
-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN workspaces.status IS 'Workspace status: active (normal), suspended (temp), frozen (kill switch)';
COMMENT ON COLUMN workspaces.frozen_at IS 'Timestamp when workspace was frozen';
COMMENT ON COLUMN workspaces.frozen_by IS 'Clerk user ID of Super Admin who froze the workspace';
COMMENT ON COLUMN workspaces.freeze_reason IS 'Reason provided for freezing the workspace';
COMMENT ON TABLE governance_audit_log IS 'Audit trail for Super Admin governance actions';