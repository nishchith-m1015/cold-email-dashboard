-- Ensure auth.clerk_user_id() exists (fallback to JWT sub)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '');
$$ LANGUAGE sql STABLE;

-- Create campaigns table (workspace-scoped)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);

-- Enable RLS and enforce workspace isolation
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_workspace_isolation ON campaigns
  USING (
    workspace_id = auth.clerk_user_id()
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
    OR workspace_id = 'default'
  )
  WITH CHECK (
    workspace_id = auth.clerk_user_id()
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
    OR workspace_id = 'default'
  );

-- Materialized views for daily stats and LLM costs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_stats AS
SELECT
  workspace_id,
  campaign_name,
  DATE(event_ts) AS day,
  COUNT(*) FILTER (WHERE event_type IN ('sent','delivered')) AS sends,
  COUNT(*) FILTER (WHERE event_type = 'replied') AS replies,
  COUNT(*) FILTER (WHERE event_type = 'opt_out') AS opt_outs,
  COUNT(*) FILTER (WHERE event_type = 'bounced') AS bounces,
  COUNT(*) FILTER (WHERE event_type = 'opened') AS opens,
  COUNT(*) FILTER (WHERE event_type = 'clicked') AS clicks,
  NOW() AS refreshed_at
FROM email_events
GROUP BY workspace_id, campaign_name, DATE(event_ts);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_llm_cost AS
SELECT
  workspace_id,
  provider,
  model,
  DATE(created_at) AS day,
  SUM(cost_usd) AS cost_usd,
  SUM(tokens_in) AS tokens_in,
  SUM(tokens_out) AS tokens_out,
  COUNT(*) AS calls,
  NOW() AS refreshed_at
FROM llm_usage
GROUP BY workspace_id, provider, model, DATE(created_at);

-- Refresh function for both views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_llm_cost;
END;
$$ LANGUAGE plpgsql;

-- Freshness helper
CREATE OR REPLACE FUNCTION get_view_freshness()
RETURNS TABLE(view_name TEXT, refreshed_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 'mv_daily_stats'::TEXT, refreshed_at FROM mv_daily_stats LIMIT 1
  UNION ALL
  SELECT 'mv_llm_cost'::TEXT, refreshed_at FROM mv_llm_cost LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Indexes to speed view refresh scans
CREATE INDEX IF NOT EXISTS idx_email_events_event_ts_ws ON email_events(workspace_id, event_ts);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_ws ON llm_usage(workspace_id, created_at);

