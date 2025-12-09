# n8n Research Logging Implementation Guide

## Overview
This guide explains how to add research quality logging to the `Email Preparation` workflow. The logging system tracks Google CSE research data to help audit AI hallucinations and improve research quality.

---

## Prerequisites
- `Email Preparation` workflow running in n8n
- Dashboard `/api/research/log` endpoint deployed
- Supabase `research_logs` table created (via migration)

---

## Implementation Steps

### Step 1: Add Research Logging Node

**Location:** After the "Summarize (O3-mini)" node (the one that processes Google CSE results)

**Node Type:** HTTP Request

**Node Name:** `📊 Log Research Quality`

### Step 2: Configure the HTTP Request Node

#### Basic Settings
- **Method:** POST
- **URL:** `https://cold-email-dashboard.vercel.app/api/research/log`
  - For local testing: `https://your-ngrok-url.ngrok-free.dev/api/research/log`

#### Authentication
- **Header Name:** `x-webhook-token`
- **Header Value:** `{{ $env.DASH_WEBHOOK_TOKEN }}`
  - Or paste your actual token if not using env vars

#### Request Body (JSON)

```json
{
  "contact_email": "={{ $('Get Research Report').first().json.email_address }}",
  "campaign_name": "={{ $('Get Research Report').first().json.campaign_name || 'Unknown Campaign' }}",
  "search_query": "={{ $('Build Google Maps Query').last().json.gmaps_query || $('Build CSE Query').last().json.search_query || 'Query not found' }}",
  "raw_results": "={{ JSON.stringify($('Summarize (O3-mini)').last().json) }}",
  "summary": "={{ $('Summarize (O3-mini)').last().json?.choices?.[0]?.message?.content || 'No summary generated' }}",
  "sources_count": "={{ $('Google CSE').last().json?.searchInformation?.totalResults ? parseInt($('Google CSE').last().json.searchInformation.totalResults) : 0 }}",
  "workflow_run_id": "={{ $execution.id }}",
  "lead_id": "={{ $('Get Research Report').first().json.id || null }}"
}
```

#### Options
- **Ignore SSL Issues:** OFF
- **Response:** JSON
- **Timeout:** 5000ms

---

## Step 3: Update Workflow Flow

### Before
```
Get Research Report
  → Build CSE Query
  → Google CSE
  → Summarize (O3-mini)
  → Email 1,2,
```

### After
```
Get Research Report
  → Build CSE Query
  → Google CSE
  → Summarize (O3-mini)
  → 📊 Log Research Quality  ← NEW NODE
  → Email 1,2,
```

**Connection:** Connect the output of "Summarize (O3-mini)" to the input of "📊 Log Research Quality", then connect the output of "📊 Log Research Quality" to "Email 1,2,"

---

## Step 4: Test the Integration

### 4.1 Run a Test Lead
1. Execute the workflow with a single lead
2. Check the execution log for the "📊 Log Research Quality" node
3. Expected response:
```json
{
  "success": true,
  "log_id": "uuid-here",
  "quality_score": 7
}
```

### 4.2 Verify in Supabase
Run this query in Supabase SQL Editor:
```sql
SELECT 
  contact_email,
  search_query,
  quality_score,
  sources_count,
  created_at
FROM research_logs
ORDER BY created_at DESC
LIMIT 5;
```

You should see your test lead's research data.

### 4.3 Verify in Dashboard (Future Feature)
Once the Research Audit page is built, you'll see:
- All research logs
- Quality score distribution
- Flagged low-quality research (score < 4)

---

## Quality Score Calculation

The quality score is automatically calculated by the API based on:

### Sources Score (60% weight)
- 0-3 sources: 1-5 points
- 4-6 sources: 6-8 points
- 7+ sources: 9-10 points

### Summary Score (40% weight)
- <100 chars: 1-3 points
- 100-300 chars: 4-7 points
- 300+ chars: 8-10 points

### Final Score: 1-10

**Quality Thresholds:**
- ✅ 8-10: High quality (sufficient sources, comprehensive summary)
- ⚠️ 5-7: Medium quality (acceptable but could improve)
- ❌ 1-4: Low quality (investigate for hallucinations)

---

## Error Handling

### Issue: 401 Unauthorized
**Cause:** Missing or incorrect webhook token  
**Fix:** Verify `x-webhook-token` header matches `DASH_WEBHOOK_TOKEN` in your environment

### Issue: 400 Bad Request
**Cause:** Missing required fields (contact_email, search_query, summary)  
**Fix:** Check that the data references are correct (use `.first()` or `.last()` for merged data)

### Issue: 500 Internal Server Error
**Cause:** Database connection issue or invalid JSON in raw_results  
**Fix:** Check Supabase connection and verify JSON.stringify() is working

### Issue: Node times out
**Cause:** Slow API response or network issues  
**Fix:** Increase timeout to 10000ms, check Vercel function logs

---

## Data Privacy Notes

- **Contact Email:** Stored for linking research to leads
- **Raw Results:** Full CSE JSON response (may contain business info)
- **Summary:** AI-generated text about the company
- **Workspace Isolation:** All logs are scoped to workspace_id

**Recommendation:** If handling sensitive data, consider:
1. Hashing email addresses
2. Storing only metadata (not full raw_results)
3. Setting up automatic purging of old logs (90+ days)

---

## Optional: Add Cost Tracking for Research Logging

If you want to track the cost of the Summarize (O3-mini) call, ensure your cost tracking accumulator includes:

```javascript
// In the "Track Pain Points" or equivalent cost node
const costs = $('💰 Init Cost Tracking').first().json._cost_events || [];
costs.push({
  provider: 'openai',
  model: 'o3-mini-2025-01-31',
  cost_usd: summaryResponse.usage.total_tokens * 0.0000011, // o3-mini pricing
  tokens_in: summaryResponse.usage.prompt_tokens,
  tokens_out: summaryResponse.usage.completion_tokens,
  purpose: 'research_summarization',
  contact_email: leadEmail,
  campaign_name: campaignName,
});
return [{ json: { _cost_events: costs } }];
```

---

## Monitoring & Maintenance

### Weekly
- Review quality score distribution in Supabase
- Identify campaigns with low average scores
- Investigate low-quality research patterns

### Monthly
- Analyze if quality scores correlate with reply rates
- Adjust search query strategy if needed
- Purge old logs (optional)

### Query for Low-Quality Research
```sql
SELECT 
  campaign_name,
  AVG(quality_score) as avg_quality,
  COUNT(*) as total_logs,
  COUNT(CASE WHEN quality_score < 5 THEN 1 END) as low_quality_count
FROM research_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY campaign_name
ORDER BY avg_quality ASC;
```

---

## Next Steps

1. ✅ Apply this guide to `Email Preparation` workflow
2. ✅ Test with 1-2 leads
3. ✅ Verify logs in Supabase
4. 🔜 Build Research Audit page in dashboard (Phase 16 completion)
5. 🔜 Set up alerts for quality scores < 4

---

**Last Updated:** December 8, 2025  
**Author:** AI Assistant  
**Related:** `docs/PHASED_OPTIMIZATION_ROADMAP.md` (Phase 16)

