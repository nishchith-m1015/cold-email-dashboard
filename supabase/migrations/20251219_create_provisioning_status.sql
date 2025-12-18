-- ============================================================
-- PHASE 33.1: Provisioning Status Table
-- ============================================================
-- Tracks the progress of campaign provisioning steps.
-- Enables real-time progress display in the UI.
CREATE TABLE IF NOT EXISTS provisioning_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provision_id UUID NOT NULL,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    step TEXT NOT NULL CHECK (
        step IN ('db', 'n8n_clone', 'webhook', 'activate')
    ),
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'running', 'done', 'error')
    ),
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Index for fast lookups by provision_id
CREATE INDEX IF NOT EXISTS idx_prov_status_provision ON provisioning_status(provision_id);
CREATE INDEX IF NOT EXISTS idx_prov_status_campaign ON provisioning_status(campaign_id);
-- Enable RLS
ALTER TABLE provisioning_status ENABLE ROW LEVEL SECURITY;
-- Service role can do everything (API uses service role)
CREATE POLICY "Service role full access" ON provisioning_status FOR ALL USING (true) WITH CHECK (true);