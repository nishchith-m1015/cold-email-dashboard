-- ============================================
-- Phase 7a: Materialized Views for Dashboard Performance
-- ============================================
-- This migration creates materialized views to pre-calculate
-- aggregations that are expensive to compute on every request.
--
-- Benefits:
-- - Queries on views are 10-100x faster than raw table scans
-- - Reduces database CPU usage
-- - Enables instant dashboard loads
--
-- Trade-off:
-- - Data is slightly stale (refresh needed)
-- - Recommended refresh interval: every 5 minutes via pg_cron or API
-- ============================================

-- ============================================
-- VIEW 1: mv_daily_stats
-- Aggregates email events by day/campaign/workspace
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_daily_stats CASCADE;

CREATE MATERIALIZED VIEW mv_daily_stats AS
SELECT
  workspace_id,
  campaign_name,
  DATE(event_ts) AS day,
  
  -- Event counts using conditional aggregation
  COUNT(*) FILTER (WHERE event_type = 'sent') AS sends,
  COUNT(*) FILTER (WHERE event_type = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE event_type = 'opened') AS opens,
  COUNT(*) FILTER (WHERE event_type = 'clicked') AS clicks,
  COUNT(*) FILTER (WHERE event_type = 'replied') AS replies,
  COUNT(*) FILTER (WHERE event_type = 'bounced') AS bounces,
  COUNT(*) FILTER (WHERE event_type = 'opt_out') AS opt_outs,
  
  -- Unique contacts (for reach metrics)
  COUNT(DISTINCT contact_email) AS unique_contacts,
  
  -- Email step breakdown
  COUNT(*) FILTER (WHERE event_type = 'sent' AND email_number = 1) AS email_1_sends,
  COUNT(*) FILTER (WHERE event_type = 'sent' AND email_number = 2) AS email_2_sends,
  COUNT(*) FILTER (WHERE event_type = 'sent' AND email_number = 3) AS email_3_sends,
  
  -- Timestamp for freshness tracking
  NOW() AS refreshed_at

FROM email_events
WHERE event_ts IS NOT NULL
GROUP BY workspace_id, campaign_name, DATE(event_ts);

-- Required unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_daily_stats_unique 
  ON mv_daily_stats (workspace_id, campaign_name, day);

-- Performance indexes for common query patterns
CREATE INDEX idx_mv_daily_stats_day ON mv_daily_stats (day);
CREATE INDEX idx_mv_daily_stats_workspace ON mv_daily_stats (workspace_id);
CREATE INDEX idx_mv_daily_stats_campaign ON mv_daily_stats (campaign_name);
CREATE INDEX idx_mv_daily_stats_workspace_day ON mv_daily_stats (workspace_id, day);

-- ============================================
-- VIEW 2: mv_llm_cost
-- Aggregates LLM usage/cost by day/model/provider/workspace
-- ============================================

DROP MATERIALIZED VIEW IF EXISTS mv_llm_cost CASCADE;

CREATE MATERIALIZED VIEW mv_llm_cost AS
SELECT
  workspace_id,
  provider,
  model,
  DATE(created_at) AS day,
  
  -- Cost aggregations
  SUM(cost_usd)::DECIMAL(12, 6) AS total_cost,
  SUM(tokens_in) AS total_tokens_in,
  SUM(tokens_out) AS total_tokens_out,
  COUNT(*) AS call_count,
  
  -- Average cost per call (useful for monitoring)
  AVG(cost_usd)::DECIMAL(12, 6) AS avg_cost_per_call,
  
  -- Campaign breakdown (for filtering)
  COUNT(DISTINCT campaign_name) AS campaigns_used,
  
  -- Timestamp for freshness tracking
  NOW() AS refreshed_at

FROM llm_usage
WHERE created_at IS NOT NULL
GROUP BY workspace_id, provider, model, DATE(created_at);

-- Required unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_llm_cost_unique 
  ON mv_llm_cost (workspace_id, provider, model, day);

-- Performance indexes for common query patterns
CREATE INDEX idx_mv_llm_cost_day ON mv_llm_cost (day);
CREATE INDEX idx_mv_llm_cost_workspace ON mv_llm_cost (workspace_id);
CREATE INDEX idx_mv_llm_cost_provider ON mv_llm_cost (provider);
CREATE INDEX idx_mv_llm_cost_workspace_day ON mv_llm_cost (workspace_id, day);

-- ============================================
-- REFRESH FUNCTION
-- Refreshes both views concurrently (non-blocking)
-- ============================================

CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS TABLE (
  view_name TEXT,
  status TEXT,
  refreshed_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Refresh email stats view
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
  
  -- Refresh LLM cost view  
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_llm_cost;
  
  -- Return status
  RETURN QUERY
  SELECT 
    'mv_daily_stats'::TEXT,
    'refreshed'::TEXT,
    NOW();
    
  RETURN QUERY
  SELECT 
    'mv_llm_cost'::TEXT,
    'refreshed'::TEXT,
    NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER: Get view freshness
-- ============================================

CREATE OR REPLACE FUNCTION get_view_freshness()
RETURNS TABLE (
  view_name TEXT,
  last_refreshed TIMESTAMPTZ,
  age_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'mv_daily_stats'::TEXT,
    (SELECT refreshed_at FROM mv_daily_stats LIMIT 1),
    EXTRACT(EPOCH FROM (NOW() - (SELECT refreshed_at FROM mv_daily_stats LIMIT 1)))::INTEGER;
    
  RETURN QUERY
  SELECT 
    'mv_llm_cost'::TEXT,
    (SELECT refreshed_at FROM mv_llm_cost LIMIT 1),
    EXTRACT(EPOCH FROM (NOW() - (SELECT refreshed_at FROM mv_llm_cost LIMIT 1)))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA POPULATION
-- Run refresh to populate views with existing data
-- ============================================

-- Note: Initial refresh cannot use CONCURRENTLY (views are empty)
REFRESH MATERIALIZED VIEW mv_daily_stats;
REFRESH MATERIALIZED VIEW mv_llm_cost;

-- ============================================
-- GRANT PERMISSIONS
-- Ensure service role can access views
-- ============================================

GRANT SELECT ON mv_daily_stats TO authenticated;
GRANT SELECT ON mv_daily_stats TO service_role;
GRANT SELECT ON mv_llm_cost TO authenticated;
GRANT SELECT ON mv_llm_cost TO service_role;
GRANT EXECUTE ON FUNCTION refresh_dashboard_views() TO service_role;
GRANT EXECUTE ON FUNCTION get_view_freshness() TO service_role;

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON MATERIALIZED VIEW mv_daily_stats IS 
  'Pre-aggregated daily email event statistics. Refresh every 5 minutes.';

COMMENT ON MATERIALIZED VIEW mv_llm_cost IS 
  'Pre-aggregated daily LLM cost breakdown. Refresh every 5 minutes.';

COMMENT ON FUNCTION refresh_dashboard_views() IS 
  'Refreshes all dashboard materialized views concurrently. Call via API or pg_cron.';

COMMENT ON FUNCTION get_view_freshness() IS 
  'Returns the age of each materialized view for staleness monitoring.';
