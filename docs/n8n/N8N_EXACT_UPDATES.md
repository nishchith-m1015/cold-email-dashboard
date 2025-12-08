# N8N Workflow Updates - EXACT JSON EXPRESSIONS

## 🎯 Quick Overview

Your n8n workflows use **n8n expression format** (starting with `=`).
You need to add **2 new fields** to existing HTTP Request nodes.

**DON'T DELETE ANYTHING** - Just add the new fields!

---

## 📧 Email Event Tracking Nodes

### Current Pattern in Your Workflows:
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets5').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 1,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"{{ $('Google Sheets5').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Google Sheets5').item.json.email_1_body }}\"\n}"
```

### ✅ Updated Version (Add 2 Lines):
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets5').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 1,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"{{ $('Google Sheets5').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Google Sheets5').item.json.email_1_body }}\",\n  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets5').item.json.email_address }}\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

**What Changed:** Added 2 lines at the end (before the closing `}`)

---

## 📋 Step-by-Step for Each Workflow

### 1️⃣ Email 1.json - "Track Email Sent" Node

**Find the node named:** `Track Email Sent` (node ID: `track-email-1`)

**Current jsonBody:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets5').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 1,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"{{ $('Google Sheets5').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Google Sheets5').item.json.email_1_body }}\"\n}"
```

**Replace with:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets5').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 1,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"{{ $('Google Sheets5').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Google Sheets5').item.json.email_1_body }}\",\n  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets5').item.json.email_address }}_step1\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

---

### 2️⃣ Email 2.json - "Track Email Sent" Node

**Current jsonBody:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets8').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 2,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"Re: {{ $('Google Sheets8').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Code4').item.json.raw }}\"\n}"
```

**Replace with:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets8').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 2,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"Re: {{ $('Google Sheets8').item.json.email_1_subject }}\",\n  \"body\": \"{{ $('Code4').item.json.raw }}\",\n  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets8').item.json.email_address }}_step2\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

---

### 3️⃣ Email 3.json - "Track Email Sent" Node

**Current jsonBody:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets13').item.json['Email Adress '] }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 3,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"{{ $('Google Sheets13').item.json['Email #3 Subject'] }}\",\n  \"body\": \"{{ $('Google Sheets13').item.json['Email #3 Body'] }}\"\n}"
```

**Replace with:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Google Sheets13').item.json['Email Adress '] }}\",\n  \"campaign\": \"Ohio\",\n  \"step\": 3,\n  \"event_type\": \"sent\",\n  \"provider\": \"gmail\",\n  \"provider_message_id\": \"{{ $json.id }}\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"subject\": \"{{ $('Google Sheets13').item.json['Email #3 Subject'] }}\",\n  \"body\": \"{{ $('Google Sheets13').item.json['Email #3 Body'] }}\",\n  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets13').item.json['Email Adress '] }}_step3\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

---

### 4️⃣ Reply Tracker.json - "Track Reply" Node

**Current jsonBody:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $json.email_address }}\",\n  \"campaign\": \"{{ $json.state || 'Ohio' }}\",\n  \"step\": {{ $json.email_3_sent === 'Yes' ? 3 : ($json.email_2_sent === 'Yes' ? 2 : 1) }},\n  \"event_type\": \"replied\",\n  \"provider\": \"gmail\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\"\n}"
```

**Replace with:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $json.email_address }}\",\n  \"campaign\": \"{{ $json.state || 'Ohio' }}\",\n  \"step\": {{ $json.email_3_sent === 'Yes' ? 3 : ($json.email_2_sent === 'Yes' ? 2 : 1) }},\n  \"event_type\": \"replied\",\n  \"provider\": \"gmail\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"idempotency_key\": \"reply_{{ $execution.id }}_{{ $json.email_address }}\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

---

### 5️⃣ Opt-Out.json - "Track Opt Out" Node

**Current jsonBody:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Opted-Out').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"event_type\": \"opt_out\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\"\n}"
```

**Replace with:**
```json
"jsonBody": "={\n  \"contact_email\": \"{{ $('Opted-Out').item.json.email_address }}\",\n  \"campaign\": \"Ohio\",\n  \"event_type\": \"opt_out\",\n  \"event_ts\": \"{{ new Date().toISOString() }}\",\n  \"idempotency_key\": \"optout_{{ $execution.id }}_{{ $('Opted-Out').item.json.email_address }}\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}"
```

---

## 💰 Cost Event Tracking Nodes

### 6️⃣ Email Preparation.json - "Send Cost Events to Dashboard1" Node

**Current jsonBody:**
```json
"jsonBody": "={{ JSON.stringify($('Edit Email fields1').first().json._cost_events || []) }}"
```

**THIS ONE IS DIFFERENT!** It sends an **array** of cost events.

You need to **modify the Code node** that builds `_cost_events` to include idempotency_key.

**Find the node:** `💰 Track Analyze Cost1` (Code node)

**Look for this section in the code:**
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

**Replace with:**
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

**What Changed:** Added 2 lines:
```javascript
idempotency_key: `cost_${$execution.id}_analyze_${leadEmail}`,
n8n_execution_id: $execution.id,
```

**Repeat this for ALL Code nodes that build cost events:**
- `💰 Track Apify Cost`
- `💰 Track Summarize Cost`
- `💰 Track Generate Email Cost`
- `💰 Track Analyze Cost1`
- Any other `💰 Track...` Code nodes

**Pattern:** For each `costEvents.push({...})`, add these 2 lines:
```javascript
idempotency_key: `cost_${$execution.id}_<purpose>_${leadEmail}`,
n8n_execution_id: $execution.id,
```

---

### 7️⃣ Research Report.json - Cost Tracking Nodes

**Same pattern as Email Preparation.json**

Find all `💰 Track...` Code nodes and add the idempotency fields to the `costEvents.push()` calls.

---

## 🎯 Visual Guide: Where to Edit in n8n UI

### For HTTP Request Nodes (Email Events):

1. **Open workflow** (Email 1, Email 2, Email 3, Reply Tracker, or Opt-Out)
2. **Click on the HTTP Request node** (usually named "Track Email Sent")
3. **Scroll to "Body" section**
4. **Click the "Expression" tab** (should already be selected)
5. **You'll see a text box with the JSON body starting with `=`**
6. **Copy the ENTIRE updated jsonBody** from above
7. **Paste it** (replacing the old one completely)
8. **Click "Save"**

### For Code Nodes (Cost Events):

1. **Open workflow** (Email Preparation or Research Report)
2. **Click on the Code node** (named "💰 Track... Cost")
3. **Find the `costEvents.push({` line**
4. **Add the 2 new lines** after `purpose: '...',`:
   ```javascript
   idempotency_key: `cost_${$execution.id}_<purpose>_${leadEmail}`,
   n8n_execution_id: $execution.id,
   ```
5. **Click "Save"**

---

## ✅ Testing After Updates

### Test Email Event Tracking:
1. **Trigger "Email 1" workflow manually**
2. **Check the HTTP Request node output**
3. **Should see:**
   ```json
   {
     "ok": true,
     "queued": true,
     "idempotency_key": "email_12345_test@example.com_step1"
   }
   ```

### Test Cost Event Tracking:
1. **Trigger "Email Preparation" workflow manually**
2. **Check the "Send Cost Events to Dashboard1" node output**
3. **Should see:**
   ```json
   {
     "ok": true,
     "queued": true,
     "results": [
       {
         "idempotency_key": "cost_12345_analyze_test@example.com",
         "queued": true
       }
     ]
   }
   ```

### Test Idempotency (Duplicate Detection):
1. **Trigger the same workflow again** (should use same execution ID if manual)
2. **Check the HTTP Request node output**
3. **Should see:**
   ```json
   {
     "ok": true,
     "queued": true,
     "deduped": true,
     "idempotency_key": "email_12345_test@example.com_step1"
   }
   ```

**`deduped: true`** means the duplicate was detected and blocked! ✅

---

## 📊 Summary of Changes

| Workflow | Node to Update | Fields to Add |
|----------|----------------|---------------|
| Email 1.json | "Track Email Sent" HTTP Request | `idempotency_key`, `n8n_execution_id` |
| Email 2.json | "Track Email Sent" HTTP Request | `idempotency_key`, `n8n_execution_id` |
| Email 3.json | "Track Email Sent" HTTP Request | `idempotency_key`, `n8n_execution_id` |
| Reply Tracker.json | "Track Reply" HTTP Request | `idempotency_key`, `n8n_execution_id` |
| Opt-Out.json | "Track Opt Out" HTTP Request | `idempotency_key`, `n8n_execution_id` |
| Email Preparation.json | All `💰 Track...` Code nodes | `idempotency_key`, `n8n_execution_id` |
| Research Report.json | All `💰 Track...` Code nodes | `idempotency_key`, `n8n_execution_id` |

**Total nodes to update:** ~10-15 nodes (depending on how many cost tracking nodes you have)

---

## ⚠️ Important Notes

1. **DON'T DELETE existing fields** - Only ADD the 2 new ones
2. **Keep the `=` at the beginning** - This tells n8n it's an expression
3. **Keep the `\n` characters** - These are newlines (formatting)
4. **Keep the `{{ }}` syntax** - This is n8n's expression syntax
5. **The idempotency_key must be unique per event** - That's why we include execution ID + email + step
6. **For cost events, update the Code nodes** - Not the HTTP Request node (it already sends the array)

---

## 🆘 Troubleshooting

### "Invalid JSON" Error
**Cause:** Missing comma or quote
**Fix:** Copy the EXACT updated jsonBody from above (don't type it manually)

### "Expression Error" 
**Cause:** Broken n8n expression syntax
**Fix:** Make sure the expression starts with `=` and uses `{{ }}` for variables

### Still Getting Duplicates
**Cause:** idempotency_key not being sent
**Fix:** Check the HTTP Request node output - should show `idempotency_key` in the request body

### 400 Bad Request
**Cause:** Missing required fields or malformed JSON
**Fix:** Use the EXACT expressions provided above

---

## 🎉 You're Done!

After updating all workflows:
1. ✅ Email events will have idempotency protection
2. ✅ Cost events will have idempotency protection
3. ✅ Duplicate prevention working (if n8n retries)
4. ✅ All events tracked in webhook_queue table
5. ✅ Ready for Phase 10 testing!

**Next:** Run `./test-phase-10.sh` to verify everything works!
