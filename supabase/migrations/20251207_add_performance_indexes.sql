-- ============================================
-- Performance Indexes for Dashboard Queries
-- Created: 2025-12-07
-- Purpose: Speed up common query patterns
-- ============================================

-- Uses CONCURRENTLY to avoid locking tables during index creation
-- This is safe for production databases with active traffic

-- ============================================
-- EMAIL EVENTS INDEXES (Most frequent queries)
-- ============================================

-- Index for date range queries with workspace filtering
-- Used by: summary, step-breakdown, timeseries endpoints
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_workspace_event_ts 
ON email_events(workspace_id, event_ts DESC);

-- Index for campaign + date range queries
-- Used by: summary, timeseries when filtered by campaign
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_workspace_campaign_event_ts 
ON email_events(workspace_id, campaign_name, event_ts DESC);

-- Index for event type filtering (sent, replied, etc.)
-- Used by: step-breakdown, summary calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_event_type 
ON email_events(event_type);

-- Composite index for the aggregate endpoint's main query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_composite 
ON email_events(event_ts DESC, event_type, campaign_name, step);

-- ============================================
-- LLM USAGE INDEXES (Cost breakdown queries)
-- ============================================

-- Index for date range queries with workspace filtering
-- Used by: cost-breakdown endpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_usage_workspace_created_at 
ON llm_usage(workspace_id, created_at DESC);

-- Index for provider filtering
-- Used by: cost-breakdown with provider filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_usage_workspace_provider_created_at 
ON llm_usage(workspace_id, provider, created_at DESC);

-- Index for campaign filtering on LLM usage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_usage_campaign_created_at 
ON llm_usage(campaign_name, created_at DESC);

-- ============================================
-- DAILY STATS INDEXES (Timeseries queries)
-- ============================================

-- Index for date range queries
-- Used by: timeseries, by-campaign endpoints
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_stats_workspace_date 
ON daily_stats(workspace_id, day DESC);

-- Index for campaign + date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_stats_campaign_date 
ON daily_stats(campaign_name, day DESC);

-- ============================================
-- LEADS INDEXES (Step breakdown queries)
-- ============================================

-- Index for workspace + campaign filtering
-- Used by: step-breakdown, leads count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_workspace_campaign 
ON leads_ohio(workspace_id, campaign_name);

-- Index for email lookups (contact matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_email 
ON leads_ohio(email_address);

-- ============================================
-- VERIFY INDEXES CREATED
-- ============================================

-- This query will list all custom indexes we created
-- Run manually to verify:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('email_events', 'llm_usage', 'daily_stats', 'leads_ohio')
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

