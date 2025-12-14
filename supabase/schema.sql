-- ============================================
-- Cold Email Dashboard - Supabase Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKSPACES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Default Workspace',
  slug TEXT NOT NULL DEFAULT 'default',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces(slug);

-- Insert default workspace
INSERT INTO workspaces (id, name, slug, plan)
VALUES ('default', 'Default Workspace', 'default', 'free')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER WORKSPACES TABLE (User ↔ Workspace mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS user_workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

CREATE INDEX idx_user_workspaces_user ON user_workspaces(user_id);
CREATE INDEX idx_user_workspaces_workspace ON user_workspaces(workspace_id);

-- ============================================
-- CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_workspace ON contacts(workspace_id);

-- ============================================
-- EMAIL EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_email TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  email_number INTEGER,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked')),
  provider TEXT,
  provider_message_id TEXT,
  event_ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subject TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, provider_message_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_email_events_workspace ON email_events(workspace_id);
CREATE INDEX idx_email_events_contact_email ON email_events(contact_email);
CREATE INDEX idx_email_events_campaign ON email_events(campaign_name);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_created ON email_events(created_at);
CREATE INDEX idx_email_events_email_number ON email_events(email_number);
CREATE INDEX IF NOT EXISTS idx_email_events_event_ts ON email_events (event_ts);

-- ============================================
-- LLM USAGE TABLE (Cost Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL,
  campaign_name TEXT,
  contact_email TEXT,
  purpose TEXT,
  workflow_id TEXT,
  run_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_workspace ON llm_usage(workspace_id);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);
CREATE INDEX idx_llm_usage_campaign ON llm_usage(campaign_name);
CREATE INDEX idx_llm_usage_created ON llm_usage(created_at);
CREATE INDEX idx_llm_usage_contact ON llm_usage(contact_email);

-- ============================================
-- DAILY STATS TABLE (Aggregated Metrics)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  day DATE NOT NULL,
  campaign_name TEXT NOT NULL,
  sends INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  opt_outs INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, day, campaign_name)
);

CREATE INDEX idx_daily_stats_workspace ON daily_stats(workspace_id);
CREATE INDEX idx_daily_stats_day ON daily_stats(day);
CREATE INDEX idx_daily_stats_campaign ON daily_stats(campaign_name);

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY contacts_workspace_isolation ON contacts
  USING (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL);

-- Email events policies
CREATE POLICY email_events_workspace_isolation ON email_events
  USING (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL);

-- LLM usage policies
CREATE POLICY llm_usage_workspace_isolation ON llm_usage
  USING (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL);

-- Daily stats policies
CREATE POLICY daily_stats_workspace_isolation ON daily_stats
  USING (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL)
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true) OR current_setting('app.workspace_id', true) IS NULL);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update daily_stats when email_events are inserted
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_stats (workspace_id, day, campaign_name, sends, replies, opt_outs, bounces, opens, clicks)
  VALUES (
    NEW.workspace_id,
    DATE(NEW.created_at),
    NEW.campaign_name,
    CASE WHEN NEW.event_type = 'sent' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'replied' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'opt_out' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'bounced' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'opened' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event_type = 'clicked' THEN 1 ELSE 0 END
  )
  ON CONFLICT (workspace_id, day, campaign_name)
  DO UPDATE SET
    sends = daily_stats.sends + EXCLUDED.sends,
    replies = daily_stats.replies + EXCLUDED.replies,
    opt_outs = daily_stats.opt_outs + EXCLUDED.opt_outs,
    bounces = daily_stats.bounces + EXCLUDED.bounces,
    opens = daily_stats.opens + EXCLUDED.opens,
    clicks = daily_stats.clicks + EXCLUDED.clicks,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update daily_stats
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT ON email_events
FOR EACH ROW
EXECUTE FUNCTION update_daily_stats();

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Create default workspace contact entry
INSERT INTO contacts (workspace_id, email)
VALUES ('default', 'system@dashboard.local')
ON CONFLICT DO NOTHING;

