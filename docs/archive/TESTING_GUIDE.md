# Phase 10 Testing Guide 🧪

**Quick Reference for Testing Webhook Queue Implementation**

---

## ✅ Prerequisites

1. **Local server running:**
   ```bash
   npm run dev
   # Server should be on http://localhost:3000
   ```

2. **Environment variable set:**
   ```bash
   export DASH_WEBHOOK_TOKEN="your-webhook-token-here"
   ```

3. **Database migration applied:**
   - Migration `20251207_webhook_queue_idempotency.sql` must be applied to Supabase

---

## 🧪 Test 1: Basic API Tests (Response Time + Idempotency)

**Run the automated test suite:**

```bash
./test-phase-10.sh
```

**What it tests:**
- ✅ Email events API response time (target: <50ms)
- ✅ Email events idempotency (duplicate prevention)
- ✅ Cost events API response time
- ✅ Cost events batch processing + idempotency
- ✅ Auto-generated idempotency keys (UUID fallback)

**Expected Results:**
```
[Test 1] Email Events API - Response Time
  Response Time: 3-8ms ✅
  HTTP Code: 200
  Response: {"ok":true,"queued":true,"idempotency_key":"test-email-..."}
  ✅ PASS - Response time under 50ms

[Test 2] Email Events API - Idempotency
  First request: {"ok":true,"queued":true,"idempotency_key":"test-duplicate-..."}
  Duplicate request: {"ok":true,"queued":true,"deduped":true,"idempotency_key":"test-duplicate-..."}
  ✅ PASS - Duplicate detected and blocked
```

---

## 📊 Test 2: Load Test (100 req/s)

**Install Artillery (if not already installed):**

```bash
npm install -g artillery
```

**Run the load test:**

```bash
artillery run load-test.yml
```

**What it tests:**
- 🚀 100 requests/second for 10 seconds
- 📧 70% email events, 30% cost events, 10% batch
- 📈 Performance thresholds: p95 < 50ms, p99 < 100ms
- ❌ Error rate < 1%

**Expected Results:**

```
Summary report @ 10:30:15(+0000)
  Scenarios launched:  1000
  Scenarios completed: 1000
  Requests completed:  1000
  Mean response/sec:   100
  Response time (msec):
    min: 2
    max: 45
    median: 4
    p95: 12
    p99: 28
  Scenario counts:
    Email Events Webhook: 700 (70%)
    Cost Events Webhook: 300 (30%)
  Codes:
    200: 1000
```

**Performance Criteria:**
- ✅ **1000 requests completed** (no timeouts)
- ✅ **p99 < 50ms** (under 100ms threshold)
- ✅ **0% error rate** (all 200 OK)
- ✅ **Sustained 100 req/s** for 10 seconds

---

## 🔍 Test 3: Monitor Queue Health

**Check queue processing status:**

```bash
./check-queue-health.sh
```

**What it shows:**
1. **Queue Health Overview** - Pending/completed/failed counts
2. **Recent Failures** - Any errors in last 24 hours
3. **Processing Latency** - How fast triggers process events
4. **Idempotency Effectiveness** - Duplicates blocked
5. **Current Backlog** - Pending event count

**Expected Results:**

```
[1] Queue Health Overview
  status    | count | oldest              | avg_seconds
  completed | 1250  | 2025-12-07 10:00:00 | 0.015
  pending   | 0     | NULL                | NULL
  failed    | 0     | NULL                | NULL

[2] Recent Failures
  ✅ No failures in last 24 hours

[3] Processing Latency
  event_type   | processed | avg_ms | max_ms | min_ms
  email_event  | 850       | 15.2   | 42.1   | 8.3
  cost_event   | 400       | 12.8   | 35.6   | 7.1

[4] Idempotency Effectiveness
  total_attempts | unique_events | duplicates_blocked
  1250           | 1000          | 250

[5] Current Backlog
  ✅ Queue is empty (all events processed)
```

**Performance Criteria:**
- ✅ **No failed events** (failed count = 0)
- ✅ **Fast processing** (avg_seconds < 0.050)
- ✅ **No backlog** (pending count < 100)
- ✅ **Duplicates blocked** (shows idempotency working)

---

## 🔍 Test 4: Manual Database Verification

**Option A: Using psql (if you have DATABASE_URL):**

```bash
# Set DATABASE_URL if not already set
export DATABASE_URL="postgresql://..."

# Check queue health view
psql "$DATABASE_URL" -c "SELECT * FROM webhook_queue_health;"

# Check for failures
psql "$DATABASE_URL" -c "SELECT * FROM webhook_failures;"

# Verify idempotency (check for duplicates)
psql "$DATABASE_URL" -c "
  SELECT idempotency_key, COUNT(*) 
  FROM webhook_queue 
  GROUP BY idempotency_key 
  HAVING COUNT(*) > 1;
"
# Expected: 0 rows (no duplicates in queue)

# Check processing latency
psql "$DATABASE_URL" -c "
  SELECT 
    event_type,
    COUNT(*) as events,
    ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000, 1) as avg_ms
  FROM webhook_queue
  WHERE status = 'completed' AND processed_at > NOW() - INTERVAL '1 hour'
  GROUP BY event_type;
"
```

**Option B: Using Supabase SQL Editor:**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run these queries:

```sql
-- Query 1: Queue health overview
SELECT * FROM webhook_queue_health;

-- Query 2: Recent failures
SELECT * FROM webhook_failures ORDER BY received_at DESC LIMIT 10;

-- Query 3: Processing latency (last hour)
SELECT 
  event_type,
  COUNT(*) as processed,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000, 1) as avg_ms,
  ROUND(MAX(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000, 1) as max_ms
FROM webhook_queue
WHERE status = 'completed' AND processed_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;

-- Query 4: Check for duplicate events (should be 0)
SELECT 
  COUNT(*) as total_queue_entries,
  COUNT(DISTINCT idempotency_key) as unique_keys,
  COUNT(*) - COUNT(DISTINCT idempotency_key) as duplicates_in_queue
FROM webhook_queue;

-- Query 5: Verify events were processed into final tables
SELECT 
  (SELECT COUNT(*) FROM email_events WHERE idempotency_key IS NOT NULL) as email_events_with_keys,
  (SELECT COUNT(*) FROM llm_usage WHERE idempotency_key IS NOT NULL) as llm_usage_with_keys;
```

---

## 🔧 Test 5: Update n8n Workflows

### **Email Event Webhook Node:**

1. Open your n8n workflow (e.g., "Email Preparation")
2. Find the HTTP Request node that calls `/api/events`
3. Update the JSON body to include `idempotency_key`:

```javascript
{
  "idempotency_key": "{{ $workflow.id }}_{{ $execution.id }}_email_{{ $('Send Email').item.json.step }}",
  "n8n_execution_id": "{{ $execution.id }}",
  "contact_email": "{{ $json.email }}",
  "event_type": "sent",
  "campaign": "{{ $json.campaign }}",
  "email_subject": "{{ $json.subject }}",
  "sequence_step": {{ $json.step }},
  "workspace_id": "{{ $json.workspace_id }}"
}
```

### **Cost Event Webhook Node:**

1. Find the HTTP Request node that calls `/api/cost-events`
2. Update the JSON body:

```javascript
{
  "idempotency_key": "{{ $workflow.id }}_{{ $execution.id }}_cost_{{ $node.name }}",
  "n8n_execution_id": "{{ $execution.id }}",
  "provider": "{{ $json.provider }}",
  "model": "{{ $json.model }}",
  "tokens_in": {{ $json.usage.input_tokens }},
  "tokens_out": {{ $json.usage.output_tokens }},
  "purpose": "{{ $workflow.name }}",
  "workflow_id": "{{ $workflow.id }}",
  "campaign_name": "{{ $json.campaign }}"
}
```

### **Test n8n Idempotency:**

1. Manually trigger the same workflow execution twice
2. Check webhook responses:
   - First run: `{"ok": true, "queued": true, "idempotency_key": "..."}`
   - Second run: `{"ok": true, "queued": true, "deduped": true, "idempotency_key": "..."}`
3. Verify in database:
   ```sql
   SELECT COUNT(*) FROM email_events WHERE n8n_execution_id = 'your-execution-id';
   -- Expected: 1 (not 2!)
   ```

---

## 📈 Success Criteria

### **API Performance:**
- ✅ Email events response time: **<50ms** (target: 2-5ms)
- ✅ Cost events response time: **<50ms** (target: 2-5ms)
- ✅ Load test: **1000 requests** complete with 0% error rate
- ✅ p99 latency: **<100ms** (target: <50ms)

### **Idempotency:**
- ✅ Duplicate requests return `"deduped": true`
- ✅ No duplicate events in `email_events` table
- ✅ No duplicate events in `llm_usage` table
- ✅ `webhook_queue` enforces UNIQUE constraint on `idempotency_key`

### **Queue Health:**
- ✅ Processing latency: **<50ms** average
- ✅ Zero failed events (or <1% failure rate)
- ✅ No backlog (pending count < 100)
- ✅ Triggers execute within seconds of queue insert

### **Data Integrity:**
- ✅ All queued events processed (status = 'completed')
- ✅ Events have `idempotency_key` populated
- ✅ n8n `execution_id` tracked in metadata

---

## 🐛 Troubleshooting

### **Problem: "Response time > 50ms"**

**Possible causes:**
1. Database trigger not installed (check migration applied)
2. Database performance issue (check Supabase metrics)
3. Network latency (test locally first)

**Fix:**
```bash
# Verify trigger exists
psql "$DATABASE_URL" -c "
  SELECT tgname FROM pg_trigger WHERE tgname = 'trg_process_webhook_queue';
"
# Should return: trg_process_webhook_queue
```

---

### **Problem: "Duplicate events NOT detected"**

**Possible causes:**
1. UNIQUE constraint not created (migration issue)
2. Different `idempotency_key` values (check key generation)

**Fix:**
```sql
-- Check if UNIQUE constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'webhook_queue' AND constraint_type = 'UNIQUE';
-- Should show: webhook_queue_idempotency_key_key (UNIQUE)

-- Check recent keys
SELECT idempotency_key, COUNT(*) 
FROM webhook_queue 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY idempotency_key 
ORDER BY COUNT(*) DESC;
```

---

### **Problem: "Queue backlog building up"**

**Possible causes:**
1. Trigger function erroring (check logs)
2. Database performance bottleneck
3. High error rate causing retries

**Fix:**
```sql
-- Check for errors
SELECT error_message, COUNT(*) 
FROM webhook_queue 
WHERE status = 'failed' 
GROUP BY error_message;

-- Manually reprocess failed events
UPDATE webhook_queue 
SET status = 'pending', retry_count = retry_count + 1
WHERE status = 'failed' AND retry_count < 3;
```

---

### **Problem: "Load test failures"**

**Possible causes:**
1. Server not running (`npm run dev`)
2. Wrong webhook token
3. Rate limiting (check rate limit config)

**Fix:**
```bash
# Check server
curl http://localhost:3000/api/health || echo "Server not running"

# Check webhook token
echo "Token: $DASH_WEBHOOK_TOKEN"

# Test single request first
curl -X POST http://localhost:3000/api/events \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contact_email":"test@test.com","event_type":"sent"}'
```

---

## 📚 Additional Resources

- **Phase 10 Architecture Plan:** `PHASE_10_ARCHITECTURE_PLAN.md`
- **Email API Complete:** `PHASE_10_STEP_2_EMAIL_API_COMPLETE.md`
- **Full Implementation Guide:** `PHASE_10_STEP_2_COMPLETE.md`
- **Database Migration:** `supabase/migrations/20251207_webhook_queue_idempotency.sql`

---

## 🎯 Quick Test Checklist

```bash
# 1. Basic tests (response time + idempotency)
./test-phase-10.sh

# 2. Load test (100 req/s for 10s)
artillery run load-test.yml

# 3. Check queue health
./check-queue-health.sh

# 4. Manual verification (Supabase SQL Editor)
# - SELECT * FROM webhook_queue_health;
# - SELECT * FROM webhook_failures;

# 5. Update n8n workflows (add idempotency_key)
# See "Test 5" section above
```

---

**All tests passing? You're ready for production! 🚀**
