-- ============================================================
-- PHASE 33.1: Add Provisioning Columns to Campaigns
-- ============================================================
-- Adds columns for provisioning tracking and template linking.
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS provision_id UUID,
    ADD COLUMN IF NOT EXISTS template_id UUID,
    ADD COLUMN IF NOT EXISTS webhook_url TEXT;
-- Index for fast provision lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_provision_id ON campaigns(provision_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON campaigns(template_id);