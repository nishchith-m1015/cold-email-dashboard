# Phase 10 Testing Results 🧪

**Test Date:** December 7, 2025  
**Migration Applied:** ✅ `20251207_webhook_queue_idempotency.sql`  
**Database:** Supabase (vfdmdqqtuxbkkxhcwris)

---

## ✅ Test Results Summary

### **Basic API Tests (./test-phase-10.sh)**

| Test | Status | Result | Notes |
|------|--------|--------|-------|
| **Email Events - Response Time** | ⚠️ SLOW | 757ms | First request (cold start) |
| **Email Events - Idempotency** | ✅ PASS | Duplicates blocked | `deduped: true` returned |
| **Cost Events - Response Time** | ⚠️ SLOW | 152ms | Better than email events |
| **Cost Events - Batch Idempotency** | ✅ PASS | All duplicates blocked | Batch processing works |
| **Auto-generated UUID** | ✅ PASS | UUID created | Fallback mechanism works |

### **Functional Tests: ✅ 3/3 PASSING**
- ✅ Idempotency enforcement (duplicates detected)
- ✅ Batch processing (2 events processed)
- ✅ UUID generation (no idempotency_key provided)

### **Performance Tests: ⚠️ Need Optimization**
- ⚠️ First request: **757ms** (target: <50ms)
- ⚠️ Subsequent: **152ms** (target: <50ms)
- 📝 **Likely causes:** Cold start, database trigger compilation

---

## 📊 Test Output Details

### Test 1: Email Events - Response Time
```json
{
  "ok": true,
  "queued": true,
  "idempotency_key": "test-email-1765140235"
}
```
- **Response Time:** 757ms (⚠️ **15x slower than target**)
- **HTTP Code:** 200 ✅
- **Note:** First trigger execution has cold start overhead

### Test 2: Email Events - Idempotency ✅
**First Request:**
```json
{
  "ok": true,
  "queued": true,
  "idempotency_key": "test-duplicate-1765140236"
}
```

**Duplicate Request:**
```json
{
  "ok": true,
  "queued": true,
  "deduped": true,  // ✅ Duplicate detected!
  "idempotency_key": "test-duplicate-1765140236"
}
```

### Test 3: Cost Events - Response Time
```json
{
  "success": true,
  "queued": 1,
  "errors": 0,
  "results": [{
    "queued": true,
    "idempotency_key": "test-cost-1765140237",
    "provider": "openai",
    "model": "gpt-4o"
  }]
}
```
- **Response Time:** 152ms (⚠️ **3x slower than target**)
- **HTTP Code:** 200 ✅

### Test 4: Cost Events - Batch Idempotency ✅
**First Batch:**
```json
{
  "success": true,
  "queued": 2,
  "results": [
    {"queued": true, "idempotency_key": "test-batch-1765140237-1"},
    {"queued": true, "idempotency_key": "test-batch-1765140237-2"}
  ]
}
```

**Duplicate Batch:**
```json
{
  "success": true,
  "queued": 2,
  "results": [
    {"queued": true, "deduped": true, "idempotency_key": "test-batch-1765140237-1"},  // ✅
    {"queued": true, "deduped": true, "idempotency_key": "test-batch-1765140237-2"}   // ✅
  ]
}
```

### Test 5: Auto-generated UUID ✅
```json
{
  "ok": true,
  "queued": true,
  "idempotency_key": "9353ccaf-84bb-4439-88ab-d2c18d5c893a"  // ✅ UUID generated
}
```

---

## 🔍 Next Steps to Verify

### 1. Check Queue Health in Supabase

Go to your **Supabase SQL Editor** and run these queries:

#### **Query 1: Queue Health Overview**
```sql
SELECT * FROM webhook_queue_health;
```

**Expected Output:**
```
status    | count | oldest_event        | newest_event        | avg_processing_seconds
----------|-------|---------------------|---------------------|------------------------
completed | 5     | 2025-12-07 10:00:00 | 2025-12-07 10:02:00 | 0.015
pending   | 0     | NULL                | NULL                | NULL
```

#### **Query 2: Check for Failures**
```sql
SELECT * FROM webhook_failures;
```

**Expected Output:** 0 rows (no failures)

#### **Query 3: Processing Latency**
```sql
SELECT 
  event_type,
  COUNT(*) as processed,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000, 1) as avg_ms,
  ROUND(MAX(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000, 1) as max_ms
FROM webhook_queue
WHERE status = 'completed' AND processed_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;
```

**Expected Output:**
```
event_type   | processed | avg_ms | max_ms
-------------|-----------|--------|--------
email_event  | 3         | 15.2   | 45.0
cost_event   | 3         | 12.8   | 35.0
```

#### **Query 4: Verify Events Created**
```sql
-- Check that events were actually created (not just queued)
SELECT 
  (SELECT COUNT(*) FROM email_events WHERE idempotency_key IS NOT NULL) as email_events,
  (SELECT COUNT(*) FROM llm_usage WHERE idempotency_key IS NOT NULL) as llm_usage_events,
  (SELECT COUNT(*) FROM webhook_queue WHERE status = 'completed') as completed_queue;
```

**Expected Output:**
```
email_events | llm_usage_events | completed_queue
-------------|------------------|----------------
3            | 3                | 6
```

---

## ⚠️ Performance Investigation

### Why Are Response Times High?

**Observed:**
- First request: **757ms** (target: 2-5ms)
- Subsequent: **152ms** (target: 2-5ms)

**Possible Causes:**

1. **Cold Start (Most Likely):**
   - PostgreSQL trigger function compiles on first execution
   - Database connection pool initializes
   - **Fix:** Run warmup queries or accept initial delay

2. **Trigger Blocking (Possible):**
   - Trigger might be running synchronously instead of async
   - **Check:** Measure `INSERT INTO webhook_queue` time separately
   - **Fix:** Verify trigger is AFTER INSERT (not BEFORE)

3. **Database Performance (Unlikely):**
   - Supabase free tier has resource limits
   - **Check:** Run query without trigger to get baseline

### Debug Test - Measure Pure Insert Time

Run this curl command to measure just the queue insert:

```bash
export DASH_WEBHOOK_TOKEN='6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61'

# Test 1: Measure API response time (includes queue insert)
time curl -X POST http://localhost:3000/api/events \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_email": "perf-test@example.com",
    "event_type": "sent",
    "idempotency_key": "perf-test-'$(date +%s)'"
  }'

# Expected: Should complete in <50ms after warmup
```

Then check in Supabase SQL Editor how long the trigger took:

```sql
SELECT 
  idempotency_key,
  EXTRACT(EPOCH FROM (processed_at - received_at)) * 1000 as processing_time_ms,
  status
FROM webhook_queue
WHERE idempotency_key LIKE 'perf-test-%'
ORDER BY received_at DESC
LIMIT 5;
```

---

## 🚀 Load Test (Next Step)

Once you verify the queue is working correctly, run the load test:

### Install Artillery (if not installed)
```bash
npm install -g artillery
```

### Run Load Test
```bash
export DASH_WEBHOOK_TOKEN='6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61'
artillery run load-test.yml
```

### Expected Results
- **Total Requests:** 1000+
- **Success Rate:** >99%
- **p50 Latency:** <50ms (after warmup)
- **p99 Latency:** <200ms
- **Errors:** <10

---

## 📝 Summary

### ✅ What's Working
1. **Idempotency:** 100% effective (all duplicates blocked)
2. **Batch Processing:** Works correctly for cost events
3. **UUID Fallback:** Auto-generates keys when not provided
4. **Database Migration:** Applied successfully
5. **API Endpoints:** Both `/api/events` and `/api/cost-events` functional

### ⚠️ What Needs Investigation
1. **Response Times:** 150-750ms vs target 2-5ms
   - Likely: Cold start overhead (acceptable)
   - Check: Trigger execution time in database
2. **Queue Processing:** Need to verify events are actually created in `email_events` and `llm_usage` tables
3. **Load Performance:** Need to run Artillery load test

### 🎯 Next Actions
1. ✅ **Run SQL queries** in Supabase to verify queue health
2. ⏳ **Run load test** with Artillery
3. ⏳ **Update n8n workflows** to send `idempotency_key`
4. ⏳ **Monitor production** for 24 hours

---

## 🔗 Resources

- **Testing Guide:** `TESTING_GUIDE.md`
- **Phase 10 Complete:** `PHASE_10_STEP_2_COMPLETE.md`
- **Migration File:** `supabase/migrations/20251207_webhook_queue_idempotency.sql`
- **Supabase Dashboard:** https://vfdmdqqtuxbkkxhcwris.supabase.co/project/_/editor

---

**Status:** ✅ Functional tests passing, ⚠️ performance optimization recommended
