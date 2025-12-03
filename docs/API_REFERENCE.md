# 🔌 API Reference

Complete reference for all dashboard API endpoints.

---

## 📥 **Ingestion APIs** (for n8n workflows)

### `POST /api/cost-events`
Log LLM/API costs from n8n workflows.

**Headers:**
```
Content-Type: application/json
x-webhook-token: YOUR_WEBHOOK_TOKEN
```

**Request Body:**
```json
[
  {
    "provider": "openai",
    "model": "o3-mini",
    "tokens_in": 291,
    "tokens_out": 572,
    "cost_usd": 0.002837,
    "campaign_name": "Ohio",
    "contact_email": "cs@foxtronix.com",
    "purpose": "company_summarization",
    "workflow_id": "CiaofBF4zkgB2bhR",
    "run_id": "990",
    "metadata": {
      "workflow_type": "Email Preparation",
      "data_source": "api_exact",
      "tracking_method": "100%_accurate_api"
    }
  }
]
```

**Response:**
```json
{
  "success": true,
  "inserted": 1,
  "errors": 0,
  "results": [
    {
      "id": "5feaeddb-a950-4fc3-9563-79791145da1a",
      "provider": "openai",
      "model": "o3-mini",
      "cost_usd": 0.002837
    }
  ]
}
```

---

### `POST /api/events`
Log email events (sent, replied, opted out).

**Headers:**
```
Content-Type: application/json
x-webhook-token: YOUR_WEBHOOK_TOKEN
```

**Request Body:**
```json
{
  "contact_email": "john@example.com",
  "campaign": "Ohio",
  "step": 1,
  "event_type": "sent",
  "provider": "gmail",
  "provider_message_id": "18c2f7a...",
  "event_ts": "2025-12-03T15:12:02.000Z"
}
```

**Event Types:**
- `sent` - Email successfully sent
- `delivered` - Email delivered (if tracking)
- `replied` - Lead replied
- `opt_out` - Lead opted out
- `bounced` - Email bounced

---

### `POST /api/llm-usage` (Legacy - use `/api/cost-events` instead)
Alternative endpoint for logging LLM costs.

**Note:** Prefer `/api/cost-events` for new implementations.

---

## 📊 **Metrics APIs** (for dashboard)

### `GET /api/metrics/summary`
Get aggregate metrics with period-over-period comparisons.

**Query Parameters:**
- `start` (required): Start date `YYYY-MM-DD`
- `end` (required): End date `YYYY-MM-DD`
- `campaign` (optional): Filter by campaign name
- `source` (optional): `sheets` or `supabase` (default: `sheets`)

**Response:**
```json
{
  "sends": 150,
  "replies": 12,
  "opt_outs": 2,
  "bounces": 1,
  "reply_rate_pct": 8.0,
  "opt_out_rate_pct": 1.33,
  "bounce_rate_pct": 0.67,
  "cost_usd": 4.52,
  "sends_change_pct": 25.5,
  "reply_rate_change_pp": 1.2,
  "opt_out_rate_change_pp": -0.3,
  "prev_sends": 120,
  "prev_reply_rate_pct": 6.8,
  "start_date": "2025-11-01",
  "end_date": "2025-11-30"
}
```

---

### `GET /api/metrics/timeseries`
Get daily time series data for charts.

**Query Parameters:**
- `metric` (required): One of `sends`, `replies`, `opt_outs`, `reply_rate`, `opt_out_rate`
- `start` (required): Start date
- `end` (required): End date
- `campaign` (optional): Filter by campaign

**Response:**
```json
{
  "metric": "sends",
  "points": [
    { "day": "2025-11-01", "value": 15 },
    { "day": "2025-11-02", "value": 18 },
    { "day": "2025-11-03", "value": 22 }
  ],
  "start_date": "2025-11-01",
  "end_date": "2025-11-30"
}
```

---

### `GET /api/metrics/by-campaign`
Get campaign-level breakdown.

**Query Parameters:**
- `start` (required): Start date
- `end` (required): End date
- `source` (optional): Data source

**Response:**
```json
{
  "campaigns": [
    {
      "campaign": "Ohio",
      "sends": 150,
      "replies": 12,
      "opt_outs": 2,
      "bounces": 1,
      "reply_rate_pct": 8.0,
      "opt_out_rate_pct": 1.33,
      "bounce_rate_pct": 0.67,
      "cost_usd": 4.52,
      "cost_per_reply": 0.38
    }
  ],
  "start_date": "2025-11-01",
  "end_date": "2025-11-30"
}
```

---

### `GET /api/metrics/cost-breakdown`
Get detailed cost breakdown by provider and model.

**Query Parameters:**
- `start` (required): Start date
- `end` (required): End date
- `campaign` (optional): Filter by campaign
- `workspace_id` (optional): Filter by workspace

**Response:**
```json
{
  "total": {
    "cost_usd": 0.06,
    "tokens_in": 8132,
    "tokens_out": 4187,
    "calls": 12
  },
  "by_provider": [
    {
      "provider": "openai",
      "cost_usd": 0.04,
      "tokens_in": 6285,
      "tokens_out": 3633,
      "calls": 6
    },
    {
      "provider": "anthropic",
      "cost_usd": 0.01,
      "tokens_in": 1847,
      "tokens_out": 554,
      "calls": 1
    }
  ],
  "by_model": [
    {
      "model": "chatgpt-4o-latest",
      "provider": "openai",
      "cost_usd": 0.03,
      "tokens_in": 4518,
      "tokens_out": 1392,
      "calls": 3
    }
  ],
  "daily": [
    { "day": "2025-12-03", "value": 0.06 }
  ],
  "start_date": "2025-12-01",
  "end_date": "2025-12-04"
}
```

---

### `GET /api/metrics/step-breakdown`
Get email sequence step breakdown.

**Query Parameters:**
- `start` (required): Start date
- `end` (required): End date
- `campaign` (optional): Filter by campaign
- `source` (optional): Data source (default: `sheets`)

**Response:**
```json
{
  "steps": [
    {
      "step": 1,
      "name": "Email 1",
      "sends": 100,
      "lastSentAt": "2025-12-03T15:12:02.000Z"
    },
    {
      "step": 2,
      "name": "Email 2",
      "sends": 45,
      "lastSentAt": "2025-12-02T10:30:15.000Z"
    },
    {
      "step": 3,
      "name": "Email 3",
      "sends": 18,
      "lastSentAt": "2025-12-01T14:22:30.000Z"
    }
  ],
  "dailySends": [
    { "date": "2025-12-01", "count": 25 },
    { "date": "2025-12-02", "count": 45 },
    { "date": "2025-12-03", "count": 100 }
  ],
  "totalSends": 163,
  "dateRange": {
    "start": "2025-11-01",
    "end": "2025-12-03"
  },
  "source": "sheets"
}
```

---

### `GET /api/campaigns`
Get list of all campaigns.

**Response:**
```json
{
  "campaigns": [
    { "name": "Ohio" },
    { "name": "California" },
    { "name": "Texas" }
  ]
}
```

---

### `POST /api/ask`
Ask AI questions about your data (natural language).

**Request Body:**
```json
{
  "question": "What's my reply rate for the Ohio campaign?"
}
```

**Response:**
```json
{
  "answer": "Your Ohio campaign has a reply rate of 8.0% based on 150 sends and 12 replies.",
  "timestamp": "2025-12-03T15:30:00Z"
}
```

---

### `GET /api/sheets`
Direct Google Sheets integration (if configured).

**Query Parameters:**
- `format` (optional): `stats` for aggregated stats, `raw` for raw rows

**Response (format=stats):**
```json
{
  "success": true,
  "stats": {
    "totalContacts": 3547,
    "email1Sends": 306,
    "email2Sends": 142,
    "email3Sends": 58,
    "totalSends": 506,
    "uniqueContactsSent": 306,
    "replies": 24,
    "optOuts": 5,
    "replyRate": 7.84,
    "optOutRate": 1.63,
    "campaignName": "Ohio"
  }
}
```

---

## 🔒 **Authentication**

All ingestion endpoints (`/api/events`, `/api/cost-events`, `/api/llm-usage`) require:

```
x-webhook-token: YOUR_WEBHOOK_TOKEN
```

Set in your `.env.local`:
```
DASH_WEBHOOK_TOKEN=6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

Metrics endpoints (`/api/metrics/*`) are currently **public** - consider adding auth for production.

---

## 💾 **Data Sources**

The dashboard can pull data from two sources:

| Source | Pros | Cons | Use Case |
|--------|------|------|----------|
| **Supabase** | Real-time, scalable, SQL | Requires webhook integration | Production, real-time tracking |
| **Google Sheets** | Easy to setup, manual editing | Slower, not real-time | Testing, quick prototypes |

Specify with `?source=sheets` or `?source=supabase` query parameter (default varies by endpoint).

---

## 🚀 **Usage in n8n**

### Example: Track OpenAI Cost

```javascript
// After OpenAI HTTP Request node, add Code node:
const response = $input.first().json;
const usage = response.usage || {};

return [{
  json: {
    provider: 'openai',
    model: response.model,
    tokens_in: usage.prompt_tokens || 0,
    tokens_out: usage.completion_tokens || 0,
    campaign_name: 'Ohio',
    contact_email: $('Get Leads').first().json.email,
    purpose: 'email_generation',
    workflow_id: $workflow.id,
    run_id: $execution.id,
    metadata: {
      data_source: 'api_exact',
      tracking_method: '100%_accurate_api'
    }
  }
}];
```

Then add HTTP Request node:
```
POST https://your-dashboard.com/api/cost-events
Headers:
  x-webhook-token: {{ $env.DASH_WEBHOOK_TOKEN }}
  Content-Type: application/json
Body: {{ JSON.stringify([$json]) }}
```

---

## 🐛 **Error Handling**

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request format",
  "details": "Missing required field: provider"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing webhook token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

---

## 📈 **Rate Limits**

Currently **no rate limits** enforced. Consider adding rate limiting for production:
- Cost events: ~100 requests/minute
- Metrics queries: ~60 requests/minute
- AI queries: ~10 requests/minute

---

## 🔗 **External References**

- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

