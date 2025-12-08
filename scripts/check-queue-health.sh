#!/bin/bash

# Phase 10 - Queue Health Monitoring Script
# Checks webhook_queue health and processing metrics

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get Supabase credentials from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}ERROR: Supabase credentials not found in .env.local${NC}"
  echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  exit 1
fi

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
SUPABASE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Webhook Queue Health Monitor                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run SQL query via Supabase REST API
run_query() {
  local query=$1
  curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\"}" 2>/dev/null || echo "[]"
}

# Query 1: Queue Health Overview
echo -e "${GREEN}[1] Queue Health Overview${NC}"
echo "────────────────────────────────────────────────────"

# Note: We'll use direct table queries since the view might not exist yet
query="SELECT 
  status,
  COUNT(*) as count,
  MIN(received_at) as oldest_event,
  MAX(received_at) as newest_event,
  AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_processing_seconds
FROM webhook_queue
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'processing' THEN 2
    WHEN 'completed' THEN 3
    WHEN 'failed' THEN 4
  END"

# Using psql if available (more reliable)
if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "
    SELECT 
      status,
      COUNT(*) as count,
      MIN(received_at) as oldest,
      MAX(received_at) as newest,
      ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at)))::numeric, 3) as avg_seconds
    FROM webhook_queue
    GROUP BY status
    ORDER BY 
      CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
      END;
  " 2>/dev/null || echo "  (Run manually: SELECT * FROM webhook_queue_health;)"
else
  echo "  Run this query in Supabase SQL Editor:"
  echo -e "  ${YELLOW}SELECT * FROM webhook_queue_health;${NC}"
fi
echo ""

# Query 2: Recent Failures
echo -e "${GREEN}[2] Recent Failures (Last 24 Hours)${NC}"
echo "────────────────────────────────────────────────────"

if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
  failure_count=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM webhook_queue 
    WHERE status = 'failed' 
      AND received_at > NOW() - INTERVAL '24 hours';
  " 2>/dev/null | xargs)
  
  if [ "$failure_count" -gt 0 ]; then
    echo -e "  ${RED}Found $failure_count failed events${NC}"
    psql "$DATABASE_URL" -c "
      SELECT 
        idempotency_key,
        error_message,
        retry_count,
        received_at
      FROM webhook_failures
      ORDER BY received_at DESC
      LIMIT 10;
    " 2>/dev/null
  else
    echo -e "  ${GREEN}✅ No failures in last 24 hours${NC}"
  fi
else
  echo "  Run this query in Supabase SQL Editor:"
  echo -e "  ${YELLOW}SELECT * FROM webhook_failures ORDER BY received_at DESC LIMIT 10;${NC}"
fi
echo ""

# Query 3: Processing Latency
echo -e "${GREEN}[3] Processing Latency (Last Hour)${NC}"
echo "────────────────────────────────────────────────────"

if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "
    SELECT 
      event_type,
      COUNT(*) as processed,
      ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at)))::numeric * 1000, 1) as avg_ms,
      ROUND(MAX(EXTRACT(EPOCH FROM (processed_at - received_at)))::numeric * 1000, 1) as max_ms,
      ROUND(MIN(EXTRACT(EPOCH FROM (processed_at - received_at)))::numeric * 1000, 1) as min_ms
    FROM webhook_queue
    WHERE status = 'completed'
      AND processed_at > NOW() - INTERVAL '1 hour'
    GROUP BY event_type;
  " 2>/dev/null || echo "  (No completed events in last hour)"
else
  echo "  Run this query in Supabase SQL Editor:"
  echo -e "  ${YELLOW}SELECT 
    event_type,
    AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000 as avg_latency_ms,
    MAX(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000 as max_latency_ms
  FROM webhook_queue
  WHERE status = 'completed' AND processed_at > NOW() - INTERVAL '1 hour'
  GROUP BY event_type;${NC}"
fi
echo ""

# Query 4: Idempotency Effectiveness
echo -e "${GREEN}[4] Idempotency Effectiveness (Last 24 Hours)${NC}"
echo "────────────────────────────────────────────────────"

if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "
    SELECT 
      DATE_TRUNC('hour', created_at) as hour,
      COUNT(*) as total_attempts,
      COUNT(DISTINCT idempotency_key) as unique_events,
      COUNT(*) - COUNT(DISTINCT idempotency_key) as duplicates_blocked
    FROM webhook_queue
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY hour
    ORDER BY hour DESC
    LIMIT 24;
  " 2>/dev/null || echo "  (No events in last 24 hours)"
else
  echo "  Run this query in Supabase SQL Editor:"
  echo -e "  ${YELLOW}SELECT 
    COUNT(*) as total_attempts,
    COUNT(DISTINCT idempotency_key) as unique_events,
    COUNT(*) - COUNT(DISTINCT idempotency_key) as duplicates_blocked
  FROM webhook_queue
  WHERE created_at > NOW() - INTERVAL '24 hours';${NC}"
fi
echo ""

# Query 5: Current Backlog
echo -e "${GREEN}[5] Current Backlog Alert${NC}"
echo "────────────────────────────────────────────────────"

if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
  pending_count=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM webhook_queue WHERE status = 'pending';
  " 2>/dev/null | xargs)
  
  if [ "$pending_count" -gt 1000 ]; then
    echo -e "  ${RED}⚠️  WARNING: Large backlog detected ($pending_count pending events)${NC}"
  elif [ "$pending_count" -gt 100 ]; then
    echo -e "  ${YELLOW}⚠️  Moderate backlog: $pending_count pending events${NC}"
  elif [ "$pending_count" -gt 0 ]; then
    echo -e "  ${GREEN}✅ Normal: $pending_count pending events${NC}"
  else
    echo -e "  ${GREEN}✅ Queue is empty (all events processed)${NC}"
  fi
else
  echo "  Run this query in Supabase SQL Editor:"
  echo -e "  ${YELLOW}SELECT COUNT(*) FROM webhook_queue WHERE status = 'pending';${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Health Check Complete                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Manual Monitoring:${NC}"
echo "  - Supabase Dashboard: $SUPABASE_URL/project/_/editor"
echo "  - SQL Editor: Run queries above for real-time metrics"
echo "  - Logs: Check for trigger execution errors"
echo ""
