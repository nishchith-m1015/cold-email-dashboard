-- Create index to speed up Daily Sends and Sequence Breakdown queries
-- Uses CONCURRENTLY to avoid locking the table during index creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_events_event_ts ON email_events(event_ts);
