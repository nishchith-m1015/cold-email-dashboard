# 🚀 n8n Workflow Configuration Guide

## Your Setup Status
✅ Supabase project created with schema  
✅ 5 workflows imported  
⚠️ Workflows need configuration  
⚠️ Environment variables need to be set  

---

## Step 1: Set Up Environment Variables

First, create a `.env.local` file in your project root with these values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n Webhook Security Token
DASH_WEBHOOK_TOKEN=6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61

# Google Sheets (if you want to keep using it)
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key_here
GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email_here
GOOGLE_SHEET_ID=your_sheet_id_here
```

### Where to find your Supabase credentials:
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → use for `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role secret** → use for `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Configure Each n8n Workflow

You need to update **TWO values** in each workflow. Here's how to find and replace them:

### Values to Replace:

```
OLD: {{ $env.DASHBOARD_URL }}
NEW: http://localhost:3000

OLD: {{ $env.DASH_WEBHOOK_TOKEN }}
NEW: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

### For Each Workflow:

#### 1. **complete-cost-tracking-example.json**

Find the **"Send to Dashboard"** HTTP Request node:
- **URL field**: Change `{{ $env.DASHBOARD_URL }}/api/cost-events` to `http://localhost:3000/api/cost-events`
- **Headers** → **x-webhook-token**: Change `{{ $env.DASH_WEBHOOK_TOKEN }}` to `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61`

#### 2. **openai-with-cost-tracking.json**

Find the **"Send Cost Event"** HTTP Request node:
- **URL field**: Change to `http://localhost:3000/api/cost-events`
- **Headers** → **x-webhook-token**: Change to `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61`

#### 3. **anthropic-with-cost-tracking.json**

Find the **"Send Cost Event"** HTTP Request node:
- **URL field**: Change to `http://localhost:3000/api/cost-events`
- **Headers** → **x-webhook-token**: Change to `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61`

#### 4. **email-prep-with-cost-tracking.json**

Find the **"Send All Cost Events"** HTTP Request node:
- **URL field**: Change to `http://localhost:3000/api/cost-events`
- **Headers** → **x-webhook-token**: Change to `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61`

#### 5. **cost-tracking-subworkflow.json**

Find the **"POST to Dashboard"** HTTP Request node:
- **URL field**: Change to `http://localhost:3000/api/cost-events`
- **Headers** → **x-webhook-token**: Change to `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61`

---

## Step 3: Fix Your "Email 1" Workflow (The Running One)

You mentioned your email workflow is sending data but with wrong dates. Here's what needs to be fixed:

### Problem 1: Dates Not Showing Correctly
The workflow needs to send data with proper `event_ts` timestamps.

**Find the node that sends email events** and ensure it includes:

```javascript
{
  "workspace_id": "00000000-0000-0000-0000-000000000001",
  "campaign_name": "Your Campaign Name",  // e.g., "Ohio"
  "contact_email": "recipient@example.com",
  "event_type": "sent",  // or "replied", "opt_out", "bounced"
  "event_ts": new Date().toISOString(),  // THIS IS CRITICAL - must be current timestamp
  "step": 1,  // email step number (1, 2, or 3)
  "provider": "gmail",
  "metadata": {}
}
```

### Problem 2: Count Shows 306 Instead of 384

This suggests your workflow is:
- Sending test data instead of real data
- OR missing some records
- OR filtering incorrectly

**To fix:**
1. Make sure your workflow sends data to `/api/events` (for email events) AND `/api/cost-events` (for LLM costs)
2. Each email sent should create ONE event with `event_type: "sent"`
3. The timestamp must be when the email was actually sent

---

## Step 4: Test Your Configuration

### Test 1: Cost Events API

Run this in your terminal:

```bash
curl -X POST http://localhost:3000/api/cost-events \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "tokens_in": 100,
    "tokens_out": 200,
    "campaign_name": "Test Campaign",
    "purpose": "test"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "inserted": 1,
  "errors": 0,
  "results": [...]
}
```

### Test 2: Email Events API

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61" \
  -d '{
    "workspace_id": "00000000-0000-0000-0000-000000000001",
    "campaign_name": "Test Campaign",
    "contact_email": "test@example.com",
    "event_type": "sent",
    "event_ts": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "step": 1
  }'
```

### Test 3: Check Data in Dashboard

1. Go to http://localhost:3000/analytics
2. You should see your test cost event appear
3. Check the date range picker - make sure it includes today

---

## Step 5: Fix Date Range Issues

If data isn't showing up, check:

### In Your n8n Workflow:
```javascript
// CORRECT - Uses current time
event_ts: new Date().toISOString()

// WRONG - Uses fixed test date
event_ts: "2025-10-28T12:00:00Z"
```

### In Your Dashboard:
1. Click the date range picker (top right)
2. Select "Last 30 days" or custom range that includes TODAY
3. The dashboard only shows data within the selected range

---

## Step 6: Understanding the Data Flow

```
Your n8n Workflow
      ↓
Makes LLM API call (OpenAI/Anthropic)
      ↓
Extracts token usage from response
      ↓
POST http://localhost:3000/api/cost-events
      ↓
Supabase llm_usage table
      ↓
Dashboard /analytics page shows costs
```

---

## Troubleshooting

### "Database not configured" error
- Check that `.env.local` exists with correct Supabase credentials
- Restart your Next.js dev server: `npm run dev`

### "Unauthorized" error
- Verify the `x-webhook-token` header matches `.env.local`
- Token must be: `6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61`

### Data shows up but dates are wrong
- Check `event_ts` in your workflow uses `new Date().toISOString()`
- Verify timezone - all timestamps should be in UTC (ISO 8601 format)

### Costs show as $0.00
- Verify `tokens_in` and `tokens_out` are being sent correctly
- Check that `provider` and `model` names match the pricing table
- Supported models are listed in `/lib/constants.ts`

### Dashboard shows 306 sends instead of 384
- Your workflow might be filtering out some records
- Check if all email events have `event_type: "sent"`
- Verify the date range includes all your sends

---

## Quick Reference: API Endpoints

| Endpoint | Purpose | Headers Required |
|----------|---------|------------------|
| `POST /api/cost-events` | Track LLM costs | x-webhook-token |
| `POST /api/events` | Track email events | x-webhook-token |
| `GET /api/cost-events` | View recent costs | none |
| `GET /api/metrics/summary` | Dashboard metrics | none |

---

## Next Steps After Configuration

Once your workflows are configured:

1. ✅ Test each workflow individually
2. ✅ Verify data appears in dashboard
3. ✅ Check that dates/timestamps are correct
4. ✅ Confirm costs are calculated properly
5. ✅ Then we'll move to Clerk authentication!

---

## Need Help?

If you run into issues:
1. Check the n8n workflow execution logs
2. Check the Next.js dev server console
3. Try the curl test commands above
4. Verify your Supabase credentials are correct

Let me know what errors you see and I'll help debug!

