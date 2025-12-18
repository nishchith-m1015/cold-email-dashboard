-- ============================================
-- PHASE 32 PILLAR 1: Sync Status Table
-- Real-Time Synchronization Fabric
-- ============================================
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Main sync status table
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('live', 'syncing', 'stale', 'error')),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, workflow_id)
);
-- Indexes for performance
CREATE INDEX idx_sync_status_workspace ON sync_status(workspace_id);
CREATE INDEX idx_sync_status_heartbeat ON sync_status(last_heartbeat);
CREATE INDEX idx_sync_status_status ON sync_status(status);
-- Row Level Security
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
-- Policy: Users can only see their workspace's sync status
CREATE POLICY sync_status_workspace_isolation ON sync_status FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id
        FROM user_workspaces
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
) WITH CHECK (
    workspace_id IN (
        SELECT workspace_id
        FROM user_workspaces
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
);
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_status_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_sync_status_updated_at BEFORE
UPDATE ON sync_status FOR EACH ROW EXECUTE FUNCTION update_sync_status_timestamp();
-- Documentation comment
COMMENT ON TABLE sync_status IS 'Phase 32 Pillar 1: Real-time health tracking for n8n workflow synchronization. Tracks heartbeat status per workspace and workflow.';
COMMENT ON COLUMN sync_status.status IS 'Current sync status: live (healthy), syncing (in progress), stale (no heartbeat >60s), error (failure)';
COMMENT ON COLUMN sync_status.version IS 'Optimistic concurrency control version';
COMMENT ON COLUMN sync_status.last_heartbeat IS 'Last successful heartbeat timestamp from n8n webhook';