# Testing with Remote URLs (ngrok/Vercel)

## Quick Start

### Option 1: Vercel Deployment
```bash
export API_URL="https://your-app.vercel.app"
export DASH_WEBHOOK_TOKEN="your-webhook-token"
./test-phase-10.sh
```

### Option 2: ngrok Tunnel
```bash
export API_URL="https://your-ngrok-url.ngrok-free.app"
export DASH_WEBHOOK_TOKEN="your-webhook-token"
./test-phase-10.sh
```

### Option 3: Localhost (Development)
```bash
export API_URL="http://localhost:3000"
export DASH_WEBHOOK_TOKEN="your-webhook-token"
./test-phase-10.sh
```

## Expected Performance

### Remote URLs (Vercel/ngrok)
- **First Request:** 1-3 seconds (Vercel cold start)
- **Subsequent Requests:** 300-1000ms (network latency + SSL)
- **Acceptable Range:** Under 3000ms
- **Why Slower:**
  - Network round trip (varies by location)
  - SSL/TLS handshake
  - Vercel cold start (if no recent requests)
  - Database connection pooling

### Localhost
- **Expected:** 2-50ms
- **Database Query:** 1-5ms
- **Total Response:** Under 50ms

## Test Expectations by Environment

| Test | Localhost | Remote URL |
|------|-----------|------------|
| Email Events Response Time | <50ms | <3000ms |
| Idempotency Detection | ✅ PASS | ✅ PASS |
| Cost Events Response Time | <50ms | <3000ms |
| Batch Processing | ✅ PASS | ✅ PASS |
| Auto UUID Generation | ✅ PASS | ✅ PASS |

## Load Testing with Remote URLs

### Update load-test.yml
```yaml
config:
  target: "{{ $processEnvironment.API_URL }}"
  phases:
    - duration: 30
      arrivalRate: 5  # Lower rate for remote testing
      name: "Warm up"
    - duration: 60
      arrivalRate: 10  # Moderate load (not 100)
      name: "Sustained load"
```

### Run Load Test
```bash
export API_URL="https://your-vercel-url.vercel.app"
npx artillery run load-test.yml
```

### Expected Results (Remote)
- **Success Rate:** >95%
- **P95 Latency:** <2000ms
- **P99 Latency:** <3000ms
- **Errors:** <5% (mostly cold starts)

## Troubleshooting

### High Latency (>3 seconds)
**Possible Causes:**
- Vercel cold start (first request after idle period)
- Database connection pool exhausted
- Network congestion

**Solutions:**
```bash
# Warm up the instance first
curl -X GET "$API_URL/api/campaigns"

# Then run tests
./test-phase-10.sh
```

### Connection Refused
**Possible Causes:**
- ngrok tunnel expired
- Vercel deployment not live
- Incorrect URL

**Check:**
```bash
# Test basic connectivity
curl -I "$API_URL"

# Should return HTTP 200 or 307 (redirect)
```

### 401 Unauthorized
**Possible Causes:**
- Missing DASH_WEBHOOK_TOKEN
- Incorrect token value

**Fix:**
```bash
# Check token is set
echo $DASH_WEBHOOK_TOKEN

# Should NOT be empty
# Set it with:
export DASH_WEBHOOK_TOKEN="your-secret-token"
```

### Database Errors (relation "contacts" does not exist)
**Cause:** Trigger function not updated (still has bug)

**Fix:**
1. Open Supabase SQL Editor
2. Run `apply_fixed_trigger.sql`
3. Verify: `SELECT * FROM webhook_failures LIMIT 5;` (should be empty)

## Verifying the Trigger Fix

After applying the database trigger fix, verify it worked:

```bash
# Send a test event
curl -X POST "$API_URL/api/events" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: $DASH_WEBHOOK_TOKEN" \
  -d '{
    "contact_email": "verify@test.com",
    "event_type": "sent",
    "campaign": "Verify Fix",
    "step": 1,
    "idempotency_key": "verify-fix-'$(date +%s)'"
  }'

# Should return:
# {"ok": true, "queued": true, "idempotency_key": "verify-fix-..."}
```

Then check Supabase:

```sql
-- Check webhook queue processed successfully
SELECT * FROM webhook_queue 
WHERE status = 'completed' 
ORDER BY received_at DESC 
LIMIT 5;

-- Should see: status='completed', error_message=NULL

-- Check no new failures
SELECT * FROM webhook_failures 
ORDER BY received_at DESC 
LIMIT 5;

-- Should be EMPTY (or only old pre-fix failures)

-- Verify event was created
SELECT * FROM email_events 
WHERE contact_email = 'verify@test.com' 
ORDER BY event_ts DESC 
LIMIT 1;

-- Should see: 1 row with campaign='Verify Fix'
```

## Understanding Cold Starts

**What is a cold start?**
Vercel serverless functions "sleep" after 5-10 minutes of inactivity. The first request after sleep takes longer (1-3 seconds) because:
1. Function container must boot up
2. Database connection must be established
3. Dependencies must be loaded

**This is NORMAL and EXPECTED for serverless.**

**How to minimize:**
- Vercel Pro: Enable "Edge Functions" (faster cold starts)
- Use a cron job to ping `/api/campaigns` every 5 minutes
- Accept 1-3s for first request, 300-1000ms for subsequent

## Production Monitoring

After deploying with the trigger fix, monitor:

```sql
-- Daily webhook health
SELECT 
  DATE(received_at) as date,
  COUNT(*) as total_webhooks,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - received_at))), 2) as avg_seconds
FROM webhook_queue
WHERE received_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(received_at)
ORDER BY date DESC;
```

**Target Metrics:**
- **Success Rate:** >99%
- **Average Processing:** <0.5 seconds
- **Failed Count:** 0 (or <1% on high-volume days)

## Next Steps

1. ✅ Apply database trigger fix (`apply_fixed_trigger.sql`)
2. ✅ Run basic tests (`./test-phase-10.sh`)
3. ✅ Verify webhook queue health (SQL queries above)
4. ✅ Update n8n workflows (see `N8N_WEBHOOK_SETUP_GUIDE.md`)
5. ✅ Run load test (`artillery run load-test.yml`)
6. ✅ Monitor production (SQL query above)

## Success Criteria

**Phase 10 Complete When:**
- ✅ All 5 basic tests PASS
- ✅ Load test shows <5% failure rate (down from 91%)
- ✅ No "relation contacts does not exist" errors in webhook_failures
- ✅ Idempotency working (duplicates return `deduped: true`)
- ✅ n8n workflows sending `idempotency_key` fields
- ✅ Production monitoring shows >99% success rate
