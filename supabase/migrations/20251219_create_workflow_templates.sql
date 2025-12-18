-- ============================================================
-- PHASE 33.5: Workflow Templates Table
-- ============================================================
-- Stores pre-built campaign templates that users can clone.
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    n8n_template_id TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    icon TEXT DEFAULT 'mail',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
-- Everyone can read templates
CREATE POLICY "Public read access" ON workflow_templates FOR
SELECT USING (is_active = true);
-- Service role can manage templates
CREATE POLICY "Service role manage" ON workflow_templates FOR ALL USING (true) WITH CHECK (true);
-- Seed initial templates (placeholder IDs - update with actual n8n workflow IDs)
INSERT INTO workflow_templates (
        name,
        description,
        n8n_template_id,
        category,
        icon
    )
VALUES (
        'Cold Outreach - 3 Email Sequence',
        'Standard cold outreach with 3 follow-up emails. Includes personalization and tracking.',
        'gRvMu0xqoUvcCJDt',
        'outreach',
        'mail'
    ),
    (
        'Reply Tracker',
        'Monitors inbox for replies and automatically updates the dashboard.',
        'REPLY_TRACKER_ID',
        'tracking',
        'inbox'
    ),
    (
        'Lead Research Enrichment',
        'Enriches lead data with company info and LinkedIn profiles.',
        'RESEARCH_TEMPLATE_ID',
        'research',
        'search'
    ) ON CONFLICT DO NOTHING;