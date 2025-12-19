-- ============================================
-- PHASE 36.1: ADVANCED CONFIGURATION VAULT
-- Migration: Create workspace_config table
-- ============================================
--
-- This migration creates a key-value store for workspace
-- configuration parameters that owners can tune.
--
-- Apply with: psql <connection-string> -f supabase/migrations/20251220_create_workspace_config.sql
-- ============================================
-- ============================================
-- TABLE: workspace_config
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Workspace reference
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    -- Config key-value pair
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    value_type TEXT NOT NULL CHECK (
        value_type IN ('string', 'number', 'boolean', 'json')
    ),
    -- Metadata
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint per workspace
    UNIQUE(workspace_id, config_key)
);
-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_config_workspace ON workspace_config(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_config_key ON workspace_config(config_key);
-- ============================================
-- TRIGGER: Update timestamp on change
-- ============================================
CREATE OR REPLACE FUNCTION update_workspace_config_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS workspace_config_updated ON workspace_config;
CREATE TRIGGER workspace_config_updated BEFORE
UPDATE ON workspace_config FOR EACH ROW EXECUTE FUNCTION update_workspace_config_timestamp();
-- ============================================
-- FUNCTION: Seed default configs for new workspaces
-- ============================================
CREATE OR REPLACE FUNCTION seed_workspace_config() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO workspace_config (
        workspace_id,
        config_key,
        config_value,
        value_type,
        description
    )
VALUES (
        NEW.id,
        'MAX_EMAILS_PER_DAY',
        '100',
        'number',
        'Maximum daily email sends'
    ),
    (
        NEW.id,
        'REPLY_DELAY_MINUTES',
        '30',
        'number',
        'Delay before auto-reply'
    ),
    (
        NEW.id,
        'OFFICE_HOURS_START',
        '09:00',
        'string',
        'Start of business hours'
    ),
    (
        NEW.id,
        'OFFICE_HOURS_END',
        '17:00',
        'string',
        'End of business hours'
    ),
    (
        NEW.id,
        'ENABLE_WEEKEND_SENDS',
        'false',
        'boolean',
        'Allow weekend emails'
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Only create trigger if it doesn't exist
DROP TRIGGER IF EXISTS workspace_config_seed ON workspaces;
CREATE TRIGGER workspace_config_seed
AFTER
INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION seed_workspace_config();
-- ============================================
-- SEED EXISTING WORKSPACES
-- ============================================
-- Insert default configs for workspaces that don't have them yet
INSERT INTO workspace_config (
        workspace_id,
        config_key,
        config_value,
        value_type,
        description
    )
SELECT w.id,
    'MAX_EMAILS_PER_DAY',
    '100',
    'number',
    'Maximum daily email sends'
FROM workspaces w
WHERE NOT EXISTS (
        SELECT 1
        FROM workspace_config wc
        WHERE wc.workspace_id = w.id
            AND wc.config_key = 'MAX_EMAILS_PER_DAY'
    );
INSERT INTO workspace_config (
        workspace_id,
        config_key,
        config_value,
        value_type,
        description
    )
SELECT w.id,
    'REPLY_DELAY_MINUTES',
    '30',
    'number',
    'Delay before auto-reply'
FROM workspaces w
WHERE NOT EXISTS (
        SELECT 1
        FROM workspace_config wc
        WHERE wc.workspace_id = w.id
            AND wc.config_key = 'REPLY_DELAY_MINUTES'
    );
INSERT INTO workspace_config (
        workspace_id,
        config_key,
        config_value,
        value_type,
        description
    )
SELECT w.id,
    'OFFICE_HOURS_START',
    '09:00',
    'string',
    'Start of business hours'
FROM workspaces w
WHERE NOT EXISTS (
        SELECT 1
        FROM workspace_config wc
        WHERE wc.workspace_id = w.id
            AND wc.config_key = 'OFFICE_HOURS_START'
    );
INSERT INTO workspace_config (
        workspace_id,
        config_key,
        config_value,
        value_type,
        description
    )
SELECT w.id,
    'OFFICE_HOURS_END',
    '17:00',
    'string',
    'End of business hours'
FROM workspaces w
WHERE NOT EXISTS (
        SELECT 1
        FROM workspace_config wc
        WHERE wc.workspace_id = w.id
            AND wc.config_key = 'OFFICE_HOURS_END'
    );
INSERT INTO workspace_config (
        workspace_id,
        config_key,
        config_value,
        value_type,
        description
    )
SELECT w.id,
    'ENABLE_WEEKEND_SENDS',
    'false',
    'boolean',
    'Allow weekend emails'
FROM workspaces w
WHERE NOT EXISTS (
        SELECT 1
        FROM workspace_config wc
        WHERE wc.workspace_id = w.id
            AND wc.config_key = 'ENABLE_WEEKEND_SENDS'
    );
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE workspace_config ENABLE ROW LEVEL SECURITY;
-- Policy: Users can read configs for their workspaces
CREATE POLICY workspace_config_read ON workspace_config FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM user_workspaces uw
            WHERE uw.workspace_id = workspace_config.workspace_id
                AND uw.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
-- Policy: Only owners can modify configs
CREATE POLICY workspace_config_write ON workspace_config FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM user_workspaces uw
        WHERE uw.workspace_id = workspace_config.workspace_id
            AND uw.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND uw.role = 'owner'
    )
);
-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON workspace_config TO authenticated;
GRANT INSERT,
    UPDATE,
    DELETE ON workspace_config TO authenticated;
-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE workspace_config IS 'Key-value store for workspace configuration parameters';
COMMENT ON COLUMN workspace_config.config_key IS 'Configuration parameter name (e.g., MAX_EMAILS_PER_DAY)';
COMMENT ON COLUMN workspace_config.config_value IS 'Configuration parameter value (stored as text, parsed based on value_type)';
COMMENT ON COLUMN workspace_config.value_type IS 'Data type for parsing: string, number, boolean, or json';
COMMENT ON COLUMN workspace_config.is_sensitive IS 'If true, value should be masked in UI';