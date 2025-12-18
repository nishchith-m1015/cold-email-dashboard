-- ============================================================
-- PHASE 34.3: Role Audit Trail
-- ============================================================
-- Creates a table to log all role changes for workspace members.
-- Provides accountability and traceability for permission changes.
CREATE TABLE IF NOT EXISTS role_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    changed_by TEXT NOT NULL,
    -- Clerk user ID who made the change
    target_user TEXT NOT NULL,
    -- Clerk user ID whose role was changed
    old_role TEXT NOT NULL CHECK (
        old_role IN ('owner', 'admin', 'member', 'viewer')
    ),
    new_role TEXT NOT NULL CHECK (
        new_role IN ('owner', 'admin', 'member', 'viewer')
    ),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_role_audit_workspace ON role_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_created_at ON role_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_audit_target_user ON role_audit_log(target_user);
-- Enable RLS
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;
-- Policy: Service role can insert (API uses service role)
CREATE POLICY "Service role can insert audit logs" ON role_audit_log FOR
INSERT WITH CHECK (true);
-- Policy: Service role can read all (for admin API)
CREATE POLICY "Service role can read all audit logs" ON role_audit_log FOR
SELECT USING (true);
-- Note: Frontend access is controlled through API routes, not direct DB access
-- The API enforces that only Owners/Super Admins can view audit logs