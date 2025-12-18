-- Phase 31 Pillar 1: Schema Bridge
-- Add n8n workflow integration columns to campaigns table
-- Add new columns for n8n integration
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT,
    ADD COLUMN IF NOT EXISTS n8n_status TEXT DEFAULT 'unknown' CHECK (
        n8n_status IN ('active', 'inactive', 'unknown', 'error')
    ),
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
-- Create index on n8n_workflow_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_n8n_workflow ON campaigns(n8n_workflow_id);
-- Create composite index for status queries within a workspace
CREATE INDEX IF NOT EXISTS idx_campaigns_status_ws ON campaigns(workspace_id, status);
-- Add comment for documentation
COMMENT ON COLUMN campaigns.n8n_workflow_id IS 'Links this campaign to an n8n workflow by ID';
COMMENT ON COLUMN campaigns.n8n_status IS 'Current status of the n8n workflow: active, inactive, unknown, error';
COMMENT ON COLUMN campaigns.last_sync_at IS 'Timestamp of last synchronization with n8n';
COMMENT ON COLUMN campaigns.version IS 'Version number for optimistic concurrency control';