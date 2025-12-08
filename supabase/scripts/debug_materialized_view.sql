-- ============================================
-- DEBUG: Materialized View Investigation
-- ============================================
-- Run these queries to understand the current state
-- and verify the data is correct
-- ============================================

-- 1. Check what columns exist in mv_daily_stats
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mv_daily_stats'
ORDER BY ordinal_position;

-- 2. Sample data from materialized view (first 10 rows)
SELECT * FROM mv_daily_stats 
ORDER BY day DESC 
LIMIT 10;

-- 3. Check if email_1_sends, email_2_sends, email_3_sends have data
SELECT 
  campaign_name,
  SUM(email_1_sends) as total_email_1,
  SUM(email_2_sends) as total_email_2,
  SUM(email_3_sends) as total_email_3,
  SUM(sends) as total_sends
FROM mv_daily_stats
GROUP BY campaign_name;

-- 4. Compare with raw data to verify accuracy
SELECT 
  campaign_name,
  COUNT(*) FILTER (WHERE event_type = 'sent' AND email_number = 1) as raw_email_1,
  COUNT(*) FILTER (WHERE event_type = 'sent' AND email_number = 2) as raw_email_2,
  COUNT(*) FILTER (WHERE event_type = 'sent' AND email_number = 3) as raw_email_3,
  COUNT(*) FILTER (WHERE event_type = 'sent') as raw_total_sends
FROM email_events
WHERE event_ts >= NOW() - INTERVAL '30 days'
GROUP BY campaign_name;

-- 5. Check if email_number column has data
SELECT 
  email_number,
  COUNT(*) as count,
  COUNT(DISTINCT contact_email) as unique_contacts
FROM email_events
WHERE event_type = 'sent'
  AND event_ts >= NOW() - INTERVAL '30 days'
GROUP BY email_number
ORDER BY email_number;

-- 6. Check metadata field (is it being used instead?)
SELECT 
  email_number as direct_column,
  metadata->>'email_number' as metadata_field,
  COUNT(*) as count
FROM email_events
WHERE event_type = 'sent'
  AND event_ts >= NOW() - INTERVAL '7 days'
GROUP BY email_number, metadata->>'email_number'
LIMIT 20;

-- 7. Force refresh the materialized view
REFRESH MATERIALIZED VIEW mv_daily_stats;

-- 8. Check last refresh time
SELECT 
  campaign_name,
  MAX(refreshed_at) as last_refreshed
FROM mv_daily_stats
GROUP BY campaign_name;
