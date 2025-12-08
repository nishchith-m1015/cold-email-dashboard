# ⚡ Phase 10 Testing Quick Reference

**Copy-paste these commands to test your webhook queue implementation!**

---

## 🔧 Setup (Run Once)

```bash
# Set webhook token (check .env.local if you don't know it)
export DASH_WEBHOOK_TOKEN='6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61'

# Make scripts executable (if not already done)
chmod +x test-phase-10.sh check-queue-health.sh
```

---

## ✅ Test 1: Basic Functionality (2 minutes)

```bash
# Run automated test suite
./test-phase-10.sh
```

**What to look for:**
- ✅ 3-5 tests should PASS (idempotency, batch, UUID)
- ⚠️ Response times might be slow (150-750ms) due to cold start - **this is okay**
- ❌ If you see "table webhook_queue not found" → Run `supabase db push`

---

## 📊 Test 2: Load Test (5 minutes)

```bash
# Install Artillery (one-time)
npm install -g artillery

# Run load test (100 req/s for 10 seconds)
artillery run load-test.yml
```

**Success criteria:**
- ✅ 1000+ requests completed
- ✅ <1% error rate
- ✅ p99 latency <200ms

---

## 🔍 Test 3: Database Verification

### **Option A: Quick Supabase Check**

1. Go to: https://vfdmdqqtuxbkkxhcwris.supabase.co/project/_/editor
2. Click **SQL Editor** tab
3. Paste and run:

```sql
-- Quick health check
SELECT 
  status,
  COUNT(*) as count,
  MIN(received_at) as oldest,
  MAX(received_at) as newest
FROM webhook_queue
GROUP BY status;

-- Should show: completed = 5-10, pending = 0, failed = 0
```

### **Option B: Detailed Analysis**

```sql
-- 1. Queue health
SELECT * FROM webhook_queue_health;

-- 2. Check for failures
SELECT * FROM webhook_failures;

-- 3. Processing speed
SELECT 
  event_type,
  COUNT(*) as events,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) * 1000, 1) as avg_ms
FROM webhook_queue
WHERE status = 'completed'
GROUP BY event_type;

-- 4. Verify events created in final tables
SELECT 
  (SELECT COUNT(*) FROM email_events WHERE idempotency_key IS NOT NULL) as email_events,
  (SELECT COUNT(*) FROM llm_usage WHERE idempotency_key IS NOT NULL) as cost_events;

-- 5. Idempotency effectiveness
SELECT 
  COUNT(*) as total_attempts,
  COUNT(DISTINCT idempotency_key) as unique_events,
  COUNT(*) - COUNT(DISTINCT idempotency_key) as duplicates_blocked
FROM webhook_queue;
```

---

## 🧪 Manual API Tests

### Test Email Events
```bash
curl -X POST http://localhost:3000/api/events \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_email": "manual-test@example.com",
    "event_type": "sent",
    "campaign": "Manual Test",
    "idempotency_key": "manual-test-1"
  }'

# Expected: {"ok":true,"queued":true,"idempotency_key":"manual-test-1"}
```

### Test Duplicate (Idempotency)
```bash
# Send same request again - should be blocked
curl -X POST http://localhost:3000/api/events \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_email": "manual-test@example.com",
    "event_type": "sent",
    "campaign": "Manual Test",
    "idempotency_key": "manual-test-1"
  }'

# Expected: {"ok":true,"queued":true,"deduped":true,"idempotency_key":"manual-test-1"}
#                                      ↑↑↑↑↑↑↑↑
#                              This means duplicate was blocked!
```

### Test Cost Events
```bash
curl -X POST http://localhost:3000/api/cost-events \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "tokens_in": 1000,
    "tokens_out": 500,
    "idempotency_key": "manual-cost-1"
  }'

# Expected: {"success":true,"queued":1,"results":[{"queued":true,...}]}
```

---

## 🔎 Debugging Commands

### Check if server is running
```bash
curl http://localhost:3000/api/health || echo "❌ Server not running - run 'npm run dev'"
```

### Check webhook token
```bash
echo "Token: $DASH_WEBHOOK_TOKEN"
# Should show: Token: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

### Check migration status
```bash
supabase migration list
# Look for: 20251207 | 20251207 | 20251207
#           ↑ Local  ↑ Remote
# Both should match (migration applied)
```

### View recent logs
```bash
# In Supabase Dashboard: Logs > Postgres Logs
# Look for: "Phase 10 Migration Complete"
```

---

## 📈 What "Success" Looks Like

### ✅ Basic Tests
```
[Test 2] Email Events API - Idempotency
  ✅ PASS - Duplicate detected and blocked

[Test 4] Cost Events API - Batch Processing + Idempotency
  ✅ PASS - Batch duplicates detected and blocked

[Test 5] Auto-generated Idempotency Key
  ✅ PASS - Idempotency key auto-generated
```

### ✅ Database Queries
```sql
-- webhook_queue_health
status    | count | avg_processing_seconds
----------|-------|------------------------
completed | 5     | 0.015
pending   | 0     | NULL
failed    | 0     | NULL

-- webhook_failures
(0 rows)  ← No failures!

-- Idempotency check
total_attempts | unique_events | duplicates_blocked
10             | 5             | 5  ← 50% were duplicates (blocked successfully)
```

### ✅ Load Test
```
Summary report
  Scenarios completed: 1000
  Mean response/sec: 100
  p99: 50ms
  Codes:
    200: 1000  ← All successful!
```

---

## ⚠️ Common Issues

### Issue: "Table webhook_queue not found"
**Fix:**
```bash
supabase db push
# Then re-run tests
```

### Issue: "Response time > 1000ms"
**Cause:** Cold start (first trigger execution)  
**Solution:** Run a few warmup requests, then test again. Subsequent requests should be faster.

### Issue: "Duplicate NOT detected"
**Check:**
```sql
SELECT constraint_name 
FROM information_schema.table_constraints
WHERE table_name = 'webhook_queue' AND constraint_type = 'UNIQUE';
-- Should return: webhook_queue_idempotency_key_key
```

### Issue: "Load test fails"
**Fix:**
```bash
# 1. Check server is running
lsof -ti:3000

# 2. Test single request first
curl -X POST http://localhost:3000/api/events \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contact_email":"test@test.com","event_type":"sent"}'

# 3. If that works, retry load test
artillery run load-test.yml
```

---

## 🎯 The 5-Minute Test

**Run all critical tests in 5 minutes:**

```bash
# Terminal 1: Start server (if not already running)
npm run dev

# Terminal 2: Run tests
export DASH_WEBHOOK_TOKEN='6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61'
./test-phase-10.sh
```

**Expected:** 3-5 PASS, 0-2 FAIL (performance warnings okay)

**Then verify in Supabase SQL Editor:**
```sql
SELECT * FROM webhook_queue_health;
```

**Expected:** `completed > 0`, `failed = 0`

---

## 📞 Need Help?

**Check these files:**
- `TESTING_GUIDE.md` - Full testing instructions
- `TEST_RESULTS.md` - What results should look like
- `PHASE_10_STEP_2_COMPLETE.md` - Implementation details

**Common Questions:**

**Q: Response times are 150-750ms, not 2-5ms?**  
A: Cold start is normal. After warmup, times should drop to <50ms. Load test will show realistic performance.

**Q: How do I know if events are actually processed?**  
A: Check `email_events` and `llm_usage` tables in Supabase for new rows with `idempotency_key` populated.

**Q: Can I test without n8n?**  
A: Yes! Use the curl commands above. They simulate webhook calls.

---

**Happy Testing! 🚀**
