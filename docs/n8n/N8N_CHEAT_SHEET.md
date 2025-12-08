# 🚀 N8N Update Cheat Sheet - Copy/Paste Ready

## 📧 EMAIL EVENT NODES (5 workflows)

### Pattern Recognition
**Look for HTTP Request nodes with:**
- URL: `https://cold-email-dashboard.vercel.app/api/events`
- jsonBody starting with: `"jsonBody": "={`

### What to Add (2 lines before the closing `}`)
```
  \"idempotency_key\": \"email_{{ $execution.id }}_<CONTACT_EMAIL_EXPRESSION>_step<N>\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

### Copy-Paste Ready Snippets

#### Email 1 - Replace `<CONTACT_EMAIL_EXPRESSION>` with actual expression
```json
  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets5').item.json.email_address }}_step1\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

#### Email 2 - Replace `<CONTACT_EMAIL_EXPRESSION>` with actual expression
```json
  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets8').item.json.email_address }}_step2\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

#### Email 3 - Replace `<CONTACT_EMAIL_EXPRESSION>` with actual expression
```json
  \"idempotency_key\": \"email_{{ $execution.id }}_{{ $('Google Sheets13').item.json['Email Adress '] }}_step3\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

#### Reply Tracker
```json
  \"idempotency_key\": \"reply_{{ $execution.id }}_{{ $json.email_address }}\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

#### Opt-Out
```json
  \"idempotency_key\": \"optout_{{ $execution.id }}_{{ $('Opted-Out').item.json.email_address }}\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

---

## 💰 COST EVENT NODES (Code Nodes)

### Pattern Recognition
**Look for Code nodes named:**
- `💰 Track Apify Cost`
- `💰 Track Summarize Cost`
- `💰 Track Analyze Cost`
- `💰 Track Generate Email Cost`

### What to Add (Inside `costEvents.push({...})`)
```javascript
  idempotency_key: `cost_${$execution.id}_<purpose>_${leadEmail}`,
  n8n_execution_id: $execution.id,
```

**Place AFTER the `purpose: '...',` line**

### Copy-Paste Ready Snippets

#### For Analyze Cost
```javascript
  idempotency_key: `cost_${$execution.id}_analyze_${leadEmail}`,
  n8n_execution_id: $execution.id,
```

#### For Apify Cost
```javascript
  idempotency_key: `cost_${$execution.id}_apify_${leadEmail}`,
  n8n_execution_id: $execution.id,
```

#### For Summarize Cost
```javascript
  idempotency_key: `cost_${$execution.id}_summarize_${leadEmail}`,
  n8n_execution_id: $execution.id,
```

#### For Generate Email Cost
```javascript
  idempotency_key: `cost_${$execution.id}_generate_${leadEmail}`,
  n8n_execution_id: $execution.id,
```

---

## 🎯 Quick Workflow Checklist

### Email 1.json
- [ ] Open workflow in n8n
- [ ] Find "Track Email Sent" HTTP Request node
- [ ] Click on node → Body section → Expression tab
- [ ] Add 2 lines to jsonBody (see snippet above)
- [ ] Save node
- [ ] Save workflow
- [ ] Test manually (trigger once)

### Email 2.json
- [ ] Repeat same steps as Email 1
- [ ] Use Email 2 snippet for idempotency_key

### Email 3.json
- [ ] Repeat same steps as Email 1
- [ ] Use Email 3 snippet for idempotency_key

### Reply Tracker.json
- [ ] Open workflow in n8n
- [ ] Find "Track Reply" HTTP Request node
- [ ] Add 2 lines to jsonBody (see snippet above)
- [ ] Save and test

### Opt-Out.json
- [ ] Open workflow in n8n
- [ ] Find "Track Opt Out" HTTP Request node
- [ ] Add 2 lines to jsonBody (see snippet above)
- [ ] Save and test

### Email Preparation.json
- [ ] Open workflow in n8n
- [ ] Find ALL `💰 Track...` Code nodes (usually 3-5 nodes)
- [ ] For EACH node:
  - [ ] Click on node
  - [ ] Find `costEvents.push({` section
  - [ ] Add 2 lines after `purpose: '...',`
  - [ ] Save node
- [ ] Save workflow
- [ ] Test manually

### Research Report.json
- [ ] Repeat same steps as Email Preparation
- [ ] Find ALL `💰 Track...` Code nodes
- [ ] Add 2 lines to each costEvents.push()

---

## ✅ How to Verify It Worked

### After updating Email 1 workflow:
1. **Trigger workflow manually**
2. **Click on "Track Email Sent" node**
3. **Check the "Output" tab**
4. **Should see:**
```json
{
  "ok": true,
  "queued": true,
  "idempotency_key": "email_<execution_id>_<email>_step1"
}
```

### After updating Email Preparation workflow:
1. **Trigger workflow manually**
2. **Click on "Send Cost Events to Dashboard1" node**
3. **Check the "Output" tab**
4. **Should see:**
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

### Test Idempotency (Duplicate Detection):
1. **Trigger the SAME workflow again** (manually)
2. **Check the output**
3. **Should see `"deduped": true`**

```json
{
  "ok": true,
  "queued": true,
  "deduped": true,  // ← This means it worked!
  "idempotency_key": "email_12345_test@example.com_step1"
}
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T forget the `\n` characters
**Wrong:**
```json
"idempotency_key": "email_{{ $execution.id }}_...",  "n8n_execution_id": "..."
```

**Right:**
```json
\"idempotency_key\": \"email_{{ $execution.id }}_...\",\n  \"n8n_execution_id\": \"{{ $execution.id }}\"\n}
```

### ❌ DON'T forget the comma after the previous field
**Wrong:**
```json
  \"body\": \"{{ ... }}\"\n  \"idempotency_key\": \"...\",
```

**Right:**
```json
  \"body\": \"{{ ... }}\",\n  \"idempotency_key\": \"...\",
```

### ❌ DON'T delete existing fields
**Wrong:** Replacing entire jsonBody with just idempotency fields

**Right:** ADD the 2 new fields to the existing jsonBody

### ❌ DON'T remove the `=` at the start
**Wrong:**
```json
"jsonBody": "{\n  \"contact_email\": ..."
```

**Right:**
```json
"jsonBody": "={\n  \"contact_email\": ..."
```

---

## 🎉 Total Time: 15 Minutes

- **Email 1, 2, 3:** 2 min each = 6 min
- **Reply Tracker:** 1 min
- **Opt-Out:** 1 min
- **Email Preparation:** 4 min (multiple Code nodes)
- **Research Report:** 3 min (multiple Code nodes)

**Total:** ~15 minutes

---

## 🆘 Need Help?

**See full guide:** `N8N_EXACT_UPDATES.md`

**Common issues:**
- JSON syntax errors → Use EXACT snippets from this sheet
- Expression errors → Make sure `{{ }}` syntax is correct
- Still seeing duplicates → Check the node output shows `idempotency_key`

**Test each workflow individually before moving to the next one!**
