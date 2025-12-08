# N8N UI Visual Guide - Exactly Where to Click

## 📍 Part 1: Email Event Nodes (HTTP Request)

### Step 1: Open the Workflow
1. Go to n8n dashboard
2. Click on "Email 1" workflow (or Email 2, Email 3, etc.)

### Step 2: Find the HTTP Request Node
1. Look for a node with an HTTP icon
2. Node is usually named **"Track Email Sent"**
3. It's usually positioned right after the Gmail node
4. Click on the node to open it

### Step 3: Locate the JSON Body Field
You'll see a form with these sections:
```
Method: POST
URL: https://cold-email-dashboard.vercel.app/api/events
Headers ▼
  x-webhook-token: 6de5a8d0...
  Content-Type: application/json
Body ▼
  Body Content Type: JSON
  [Expression tab] [Fixed tab]
  ┌─────────────────────────────────────────┐
  │ ={                                      │
  │   "contact_email": "{{ ... }}",         │
  │   "campaign": "Ohio",                   │
  │   "step": 1,                            │
  │   ...                                   │
  │ }                                       │
  └─────────────────────────────────────────┘
```

**Click in this text box!** ☝️

### Step 4: Edit the JSON Expression

#### BEFORE (Your Current Setup):
```json
={
  "contact_email": "{{ $('Google Sheets5').item.json.email_address }}",
  "campaign": "Ohio",
  "step": 1,
  "event_type": "sent",
  "provider": "gmail",
  "provider_message_id": "{{ $json.id }}",
  "event_ts": "{{ new Date().toISOString() }}",
  "subject": "{{ $('Google Sheets5').item.json.email_1_subject }}",
  "body": "{{ $('Google Sheets5').item.json.email_1_body }}"
}
```

#### AFTER (Add 2 Lines):
```json
{
  "contact_email": "{{ $('Google Sheets5').item.json.email_address }}",
  "campaign": "Ohio",
  "step": 1,
  "event_type": "sent",
  "provider": "gmail",
  "provider_message_id": "{{ $json.id }}",
  "event_ts": "{{ new Date().toISOString() }}",
  "subject": "{{ $('Google Sheets5').item.json.email_1_subject }}",
  "body": "{{ $('Google Sheets5').item.json.email_1_body }}",
  "idempotency_key": "email_{{ $execution.id }}_{{ $('Google Sheets5').item.json.email_address }}_step1",
  "n8n_execution_id": "{{ $execution.id }}"
}
```

**What Changed:**
- Added comma `,` after `"body": "..."}` line
- Added `"idempotency_key": "email_{{ $execution.id }}_{{ $('Google Sheets5').item.json.email_address }}_step1",`
- Added `"n8n_execution_id": "{{ $execution.id }}"`

### Step 5: Save
1. Click **"Execute Node"** button (to test)
2. Check output shows `idempotency_key` field
3. Click **"Save"** (top right of node panel)
4. Click **"Save"** (top right of workflow editor) - saves entire workflow

---

## 📍 Part 2: Cost Event Nodes (Code Nodes)

### Step 1: Open the Workflow
1. Go to n8n dashboard
2. Click on "Email Preparation" workflow (or "Research Report")

### Step 2: Find the Code Nodes
1. Look for nodes with a `</>` icon
2. Nodes are usually named **"💰 Track ... Cost"**
   - `💰 Track Apify Cost`
   - `💰 Track Summarize Cost`
   - `💰 Track Analyze Cost1`
   - etc.
3. Click on one of these nodes

### Step 3: Locate the Code Editor
You'll see a JavaScript code editor:
```javascript
// ============================================
// COST TRACKING: OpenAI o3-mini (Analyse)
// ============================================
const PRICING = { input: 1.10, output: 4.40 };

const leadData = $('Get Email Prep1').first().json;
const leadEmail = leadData.email_address || 'unknown';
const campaignName = leadData.state || 'Unknown';

// ... more code ...

costEvents.push({
  provider: 'openai',
  model: analyseResponse.model || 'o3-mini',
  tokens_in: inputTokens,
  tokens_out: outputTokens,
  cost_usd: Math.round(cost * 1000000) / 1000000,
  campaign_name: campaignName,
  contact_email: leadEmail,
  purpose: 'prospect_analysis',
  workflow_id: $workflow.id,
  run_id: $execution.id,
  metadata: {
    total_tokens: totalTokens,
    data_source: dataSource,
    tracking_method: dataSource === 'api_exact' ? '100%_accurate_api' : 'estimate'
  }
});
```

### Step 4: Find the `costEvents.push()` Section

**Search for this line:**
```javascript
costEvents.push({
```

**Scroll down to find:**
```javascript
  purpose: 'prospect_analysis',
  workflow_id: $workflow.id,
  run_id: $execution.id,
```

### Step 5: Add the New Lines

#### BEFORE:
```javascript
costEvents.push({
  provider: 'openai',
  model: analyseResponse.model || 'o3-mini',
  tokens_in: inputTokens,
  tokens_out: outputTokens,
  cost_usd: Math.round(cost * 1000000) / 1000000,
  campaign_name: campaignName,
  contact_email: leadEmail,
  purpose: 'prospect_analysis',
  workflow_id: $workflow.id,
  run_id: $execution.id,
  metadata: {
    total_tokens: totalTokens,
    data_source: dataSource,
    tracking_method: dataSource === 'api_exact' ? '100%_accurate_api' : 'estimate'
  }
});
```

#### AFTER (Add 2 Lines):
```javascript
costEvents.push({
  provider: 'openai',
  model: analyseResponse.model || 'o3-mini',
  tokens_in: inputTokens,
  tokens_out: outputTokens,
  cost_usd: Math.round(cost * 1000000) / 1000000,
  campaign_name: campaignName,
  contact_email: leadEmail,
  purpose: 'prospect_analysis',
  idempotency_key: `cost_${$execution.id}_analyze_${leadEmail}`,
  n8n_execution_id: $execution.id,
  workflow_id: $workflow.id,
  run_id: $execution.id,
  metadata: {
    total_tokens: totalTokens,
    data_source: dataSource,
    tracking_method: dataSource === 'api_exact' ? '100%_accurate_api' : 'estimate'
  }
});
```

**What Changed:**
- Added comma `,` after `purpose: 'prospect_analysis',`
- Added `idempotency_key: \`cost_${$execution.id}_analyze_${leadEmail}\`,`
- Added `n8n_execution_id: $execution.id,`

**Note:** Use backticks `` ` `` (template literals) NOT quotes `"` for idempotency_key in JavaScript!

### Step 6: Save
1. Click **"Execute Node"** button (to test)
2. Check the `_cost_events` array in output
3. Click **"Save"** (top right of node panel)
4. Click **"Save"** (top right of workflow editor)

### Step 7: Repeat for ALL `💰 Track...` Code Nodes
**In Email Preparation.json, find and update:**
- `💰 Track Apify Cost` → `idempotency_key: \`cost_${$execution.id}_apify_${leadEmail}\`,`
- `💰 Track Summarize Cost` → `idempotency_key: \`cost_${$execution.id}_summarize_${leadEmail}\`,`
- `💰 Track Analyze Cost1` → `idempotency_key: \`cost_${$execution.id}_analyze_${leadEmail}\`,`
- Any other `💰 Track...` nodes

---

## 🎯 Testing After Updates

### Test 1: Manual Trigger
1. Click **"Test Workflow"** button (top right)
2. Select **"Manually"**
3. Click **"Execute Workflow"**
4. Wait for execution to complete

### Test 2: Check HTTP Request Node Output
1. Click on the **"Track Email Sent"** node
2. Click **"Output"** tab (bottom panel)
3. You should see:
```json
{
  "ok": true,
  "queued": true,
  "idempotency_key": "email_<execution_id>_<email>_step1"
}
```

**✅ Success!** If you see `idempotency_key` in the output.

### Test 3: Check Cost Event Node Output
1. Click on **"Send Cost Events to Dashboard1"** node
2. Click **"Output"** tab
3. You should see:
```json
{
  "ok": true,
  "queued": true,
  "results": [
    {
      "idempotency_key": "cost_<execution_id>_analyze_<email>",
      "queued": true
    }
  ]
}
```

**✅ Success!** If you see `idempotency_key` in each result.

### Test 4: Idempotency (Duplicate Detection)
1. Click **"Test Workflow"** again (same workflow)
2. Execute manually
3. Check the output
4. Should see **`"deduped": true`**

```json
{
  "ok": true,
  "queued": true,
  "deduped": true,  // ← Duplicate detected!
  "idempotency_key": "email_12345_test@example.com_step1"
}
```

**✅ Success!** Idempotency is working!

---

## 📱 Mobile/Tablet Friendly Checklist

### For Each Workflow:

#### Email 1.json
- [ ] Open workflow
- [ ] Click "Track Email Sent" node
- [ ] Find jsonBody field
- [ ] Add 2 lines (see N8N_CHEAT_SHEET.md)
- [ ] Save node
- [ ] Save workflow
- [ ] Test workflow
- [ ] Check output has `idempotency_key` ✅

#### Email 2.json
- [ ] Repeat steps above
- [ ] Use Email 2 snippet for idempotency_key

#### Email 3.json
- [ ] Repeat steps above
- [ ] Use Email 3 snippet for idempotency_key

#### Reply Tracker.json
- [ ] Open workflow
- [ ] Click "Track Reply" node
- [ ] Add 2 lines to jsonBody
- [ ] Save and test

#### Opt-Out.json
- [ ] Open workflow
- [ ] Click "Track Opt Out" node
- [ ] Add 2 lines to jsonBody
- [ ] Save and test

#### Email Preparation.json
- [ ] Open workflow
- [ ] Find ALL `💰 Track...` Code nodes
- [ ] For EACH node:
  - [ ] Add 2 lines to `costEvents.push()`
  - [ ] Save node
- [ ] Save workflow
- [ ] Test workflow
- [ ] Check output has `idempotency_key` in all cost events ✅

#### Research Report.json
- [ ] Repeat Email Preparation steps
- [ ] Update ALL `💰 Track...` Code nodes

---

## 🔍 Troubleshooting Visual Guide

### "I don't see the Expression tab"
**Fix:** Click on the **Body** section dropdown to expand it

### "I see 'Fixed' instead of 'Expression'"
**Fix:** Click the **"Expression"** tab (next to "Fixed" tab)

### "The text box is empty"
**Issue:** You're in the wrong field
**Fix:** Make sure you're in **"Body" → "JSON"** section, NOT "Query Parameters"

### "I get a red error box when I save"
**Common causes:**
- Missing comma `,` after previous field
- Extra comma `,` at the end
- Wrong quote type (use `"` for JSON, `` ` `` for JavaScript template literals)

**Fix:** Copy the EXACT snippet from `N8N_EXACT_UPDATES.md`

### "The workflow test fails"
**Check:**
1. **Is the API URL correct?** Should be `https://cold-email-dashboard.vercel.app/api/events`
2. **Is the webhook token set?** Check headers section
3. **Is the jsonBody valid?** Click "Test Step" button to validate

### "I don't see any output"
**Fix:** Make sure you clicked **"Execute Node"** or **"Test Workflow"** button

---

## ✅ Final Verification Checklist

After updating ALL workflows, verify:

### Database Check (Supabase SQL Editor):
```sql
-- Check webhook queue has new events
SELECT * FROM webhook_queue 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY received_at DESC 
LIMIT 10;

-- Should show: idempotency_key populated, status='completed'

-- Check for failures
SELECT * FROM webhook_failures 
WHERE received_at > NOW() - INTERVAL '1 hour';

-- Should be EMPTY (0 rows)

-- Check idempotency working
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT idempotency_key) as unique_events
FROM webhook_queue
WHERE created_at > NOW() - INTERVAL '1 hour';

-- If you tested same workflow twice: total should be 2, unique should be 1
```

### All Workflows Checklist:
- [ ] Email 1: ✅ Updated and tested
- [ ] Email 2: ✅ Updated and tested
- [ ] Email 3: ✅ Updated and tested
- [ ] Reply Tracker: ✅ Updated and tested
- [ ] Opt-Out: ✅ Updated and tested
- [ ] Email Preparation: ✅ All Code nodes updated and tested
- [ ] Research Report: ✅ All Code nodes updated and tested

### Success Criteria:
- [ ] All workflows show `idempotency_key` in output ✅
- [ ] Duplicate triggers return `deduped: true` ✅
- [ ] No 400/500 errors in workflow execution ✅
- [ ] Webhook queue shows `status='completed'` ✅
- [ ] No entries in `webhook_failures` table ✅

---

## 🎉 You're Done!

**Next step:** Run `./test-phase-10.sh` to verify the entire system!

**See:** `PHASE_10_COMPLETE.md` for full Phase 10 completion checklist.
