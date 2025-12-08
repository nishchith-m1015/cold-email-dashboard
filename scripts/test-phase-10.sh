#!/bin/bash

# Phase 10 - Webhook Queue Testing Script
# Tests API performance, idempotency, and queue health

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
# Override with: export API_URL="https://your-app.vercel.app" or ngrok URL
API_URL="${API_URL:-http://localhost:3000}"
WEBHOOK_TOKEN="${DASH_WEBHOOK_TOKEN}"

# Detect if using remote URL
if [[ "$API_URL" == *"vercel.app"* ]] || [[ "$API_URL" == *"ngrok"* ]]; then
  IS_REMOTE=true
  echo -e "${YELLOW}⚠️  Testing against REMOTE URL (expect higher latency)${NC}"
  echo -e "${YELLOW}   Cold starts (Vercel) can take 1-3 seconds${NC}"
  echo ""
else
  IS_REMOTE=false
fi

if [ -z "$WEBHOOK_TOKEN" ]; then
  echo -e "${RED}ERROR: DASH_WEBHOOK_TOKEN environment variable not set${NC}"
  echo "Please set it with: export DASH_WEBHOOK_TOKEN='your-token-here'"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Phase 10 - Webhook Queue Testing Suite           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}API URL:${NC} $API_URL"
echo -e "${YELLOW}Webhook Token:${NC} ${WEBHOOK_TOKEN:0:10}...${WEBHOOK_TOKEN: -5}"
echo ""

# Function to measure response time
measure_response_time() {
  local url=$1
  local data=$2
  local start=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "X-Webhook-Token: $WEBHOOK_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data")
  
  local end=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
  local duration=$((end - start))
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  echo "$duration|$http_code|$body"
}

# Test 1: Email Events - Response Time
echo -e "${GREEN}[Test 1]${NC} Email Events API - Response Time"
echo "────────────────────────────────────────────────────"

test_data='{
  "contact_email": "test@example.com",
  "event_type": "sent",
  "campaign": "Test Campaign",
  "email_subject": "Hello World",
  "sequence_step": 1,
  "idempotency_key": "test-email-'$(date +%s)'"
}'

result=$(measure_response_time "$API_URL/api/events" "$test_data")
duration=$(echo "$result" | cut -d'|' -f1)
http_code=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3)

echo -e "  Response Time: ${YELLOW}${duration}ms${NC}"
echo -e "  HTTP Code: ${YELLOW}${http_code}${NC}"
echo -e "  Response: ${body}"

if [ "$IS_REMOTE" = true ]; then
  # Remote: Allow up to 3000ms (includes network + cold start)
  if [ "$duration" -lt 3000 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - Response time acceptable for remote URL (${duration}ms)"
  else
    echo -e "  ${YELLOW}⚠️  WARNING${NC} - Response time ${duration}ms (may be cold start or slow network)"
  fi
else
  # Local: Expect under 50ms
  if [ "$duration" -lt 50 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - Response time under 50ms (target: 2-5ms)"
  else
    echo -e "  ${RED}❌ FAIL${NC} - Response time over 50ms"
  fi
fi
echo ""

# Test 2: Email Events - Idempotency
echo -e "${GREEN}[Test 2]${NC} Email Events API - Idempotency (Duplicate Prevention)"
echo "────────────────────────────────────────────────────"

idempotency_key="test-duplicate-$(date +%s)"
duplicate_test='{
  "contact_email": "duplicate@example.com",
  "event_type": "sent",
  "campaign": "Duplicate Test",
  "idempotency_key": "'$idempotency_key'"
}'

echo "  Sending first request..."
result1=$(measure_response_time "$API_URL/api/events" "$duplicate_test")
duration1=$(echo "$result1" | cut -d'|' -f1)
body1=$(echo "$result1" | cut -d'|' -f3)
echo -e "  Response: ${body1}"

sleep 0.5

echo "  Sending duplicate request (same idempotency_key)..."
result2=$(measure_response_time "$API_URL/api/events" "$duplicate_test")
duration2=$(echo "$result2" | cut -d'|' -f1)
body2=$(echo "$result2" | cut -d'|' -f3)
echo -e "  Response: ${body2}"

if echo "$body2" | grep -q '"deduped":true'; then
  echo -e "  ${GREEN}✅ PASS${NC} - Duplicate detected and blocked"
else
  echo -e "  ${RED}❌ FAIL${NC} - Duplicate NOT detected (check response)"
fi
echo ""

# Test 3: Cost Events - Response Time
echo -e "${GREEN}[Test 3]${NC} Cost Events API - Response Time"
echo "────────────────────────────────────────────────────"

cost_test='{
  "provider": "openai",
  "model": "gpt-4o",
  "tokens_in": 1000,
  "tokens_out": 500,
  "purpose": "Test Request",
  "idempotency_key": "test-cost-'$(date +%s)'"
}'

result=$(measure_response_time "$API_URL/api/cost-events" "$cost_test")
duration=$(echo "$result" | cut -d'|' -f1)
http_code=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3)

echo -e "  Response Time: ${YELLOW}${duration}ms${NC}"
echo -e "  HTTP Code: ${YELLOW}${http_code}${NC}"
echo -e "  Response: ${body}"

if [ "$IS_REMOTE" = true ]; then
  if [ "$duration" -lt 3000 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - Response time acceptable for remote URL (${duration}ms)"
  else
    echo -e "  ${YELLOW}⚠️  WARNING${NC} - Response time ${duration}ms (may be cold start or slow network)"
  fi
else
  if [ "$duration" -lt 50 ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - Response time under 50ms"
  else
    echo -e "  ${RED}❌ FAIL${NC} - Response time over 50ms"
  fi
fi
echo ""

# Test 4: Cost Events - Batch + Idempotency
echo -e "${GREEN}[Test 4]${NC} Cost Events API - Batch Processing + Idempotency"
echo "────────────────────────────────────────────────────"

batch_key1="test-batch-$(date +%s)-1"
batch_key2="test-batch-$(date +%s)-2"

batch_test='[
  {
    "idempotency_key": "'$batch_key1'",
    "provider": "openai",
    "model": "gpt-4o",
    "tokens_in": 1000,
    "tokens_out": 500
  },
  {
    "idempotency_key": "'$batch_key2'",
    "provider": "anthropic",
    "model": "claude-3.5-sonnet",
    "tokens_in": 2000,
    "tokens_out": 1000
  }
]'

echo "  Sending batch (2 events)..."
result1=$(measure_response_time "$API_URL/api/cost-events" "$batch_test")
body1=$(echo "$result1" | cut -d'|' -f3)
echo -e "  Response: ${body1}"

sleep 0.5

echo "  Sending same batch again (should be deduped)..."
result2=$(measure_response_time "$API_URL/api/cost-events" "$batch_test")
body2=$(echo "$result2" | cut -d'|' -f3)
echo -e "  Response: ${body2}"

if echo "$body2" | grep -q '"deduped":true'; then
  echo -e "  ${GREEN}✅ PASS${NC} - Batch duplicates detected and blocked"
else
  echo -e "  ${RED}❌ FAIL${NC} - Batch duplicates NOT detected"
fi
echo ""

# Test 5: Auto-generated Idempotency Key
echo -e "${GREEN}[Test 5]${NC} Auto-generated Idempotency Key (UUID Fallback)"
echo "────────────────────────────────────────────────────"

no_key_test='{
  "contact_email": "no-key@example.com",
  "event_type": "delivered",
  "campaign": "No Key Test"
}'

result=$(measure_response_time "$API_URL/api/events" "$no_key_test")
body=$(echo "$result" | cut -d'|' -f3)

echo -e "  Response: ${body}"

if echo "$body" | grep -q '"idempotency_key"'; then
  echo -e "  ${GREEN}✅ PASS${NC} - Idempotency key auto-generated"
else
  echo -e "  ${RED}❌ FAIL${NC} - No idempotency_key in response"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Basic Testing Complete!                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run load test: ${GREEN}npm install -g artillery && artillery run load-test.yml${NC}"
echo "  2. Check queue health: ${GREEN}./check-queue-health.sh${NC}"
echo "  3. Update n8n workflows with idempotency_key"
echo ""
