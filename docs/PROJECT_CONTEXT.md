# 🧠 Cold Email Dashboard - Project Context

> **Use this file to onboard a new AI chat session. Paste the "Quick Start Message" below to continue where you left off.**

---

## 📍 Quick Start Message

Copy and paste this to start a new chat:

```
Continue working on my Cold Email Analytics Dashboard project.

Context file: docs/PROJECT_CONTEXT.md
Production URL: https://cold-email-dashboard.vercel.app
GitHub: https://github.com/nishchith-m1015/cold-email-dashboard
Workspace: /Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter

Completed: Phases 1-6 (Email tracking, LLM cost tracking, Dashboard UI, Reply tracking, Click tracking, Vercel deployment)
Next up: Phase 7 (Testing & Validation) or Phase 8+ (Optional Enhancements)

Read docs/PROJECT_CONTEXT.md for full context.
```

---

## 🎯 Project Overview

**What is this?**  
A Next.js dashboard that tracks cold email campaign performance and LLM costs for an n8n-powered outreach system.

**Who is it for?**  
Nishchith @ Smartie Agents - an AI automation agency doing cold email outreach.

**Tech Stack:**
- Frontend: Next.js 14, React, Tailwind CSS, Recharts
- Backend: Supabase (PostgreSQL), Google Sheets API
- Automation: n8n workflows
- Hosting: Vercel
- LLMs: OpenAI (o3-mini, GPT-4o), Anthropic (Claude Sonnet 4.5)

---

## ✅ Completed Phases

### Phase 1: Email Event Tracking ✅
- Historical data backfill (486 emails imported)
- Real-time tracking for Email 1, 2, 3 workflows
- Opt-out tracking
- Supabase `email_events` table

### Phase 2: LLM Cost Tracking (100% Accurate) ✅
- Replaced LangChain nodes with HTTP Request nodes for exact token counts
- Services tracked:
  | Provider | Model | Tracking Method |
  |----------|-------|-----------------|
  | Relevance AI | LinkedIn Research | API run history (100%) |
  | Google CSE | Custom Search | Fixed pricing ($0.005/query) |
  | OpenAI | o3-mini | HTTP Request (100%) |
  | OpenAI | GPT-4o | HTTP Request (100%) |
  | Anthropic | Claude Sonnet 4.5 | HTTP Request (100%) |
  | Apify | Google Reviews | Compute units (~90%) |
- Cost events stored in Supabase `llm_usage` table
- Webhook endpoint: `/api/cost-events`

### Phase 3: Dashboard UI ✅
- Overview page with key metrics
- Analytics page with:
  - Daily LLM Cost chart (with timezone support)
  - Cost by provider breakdown
  - Cost by purpose breakdown
- Timezone selector (synced to localStorage)
- Ask AI feature for natural language queries
- Date range picker

### Phase 6: Production Deployment ✅
- Deployed to Vercel: `https://cold-email-dashboard.vercel.app`
- GitHub repo: `https://github.com/nishchith-m1015/cold-email-dashboard`
- Environment variables configured
- All 7 n8n workflows updated with Vercel URL

### Bug Fixes & Optimizations ✅
- Fixed date timezone shifts in charts
- Fixed Y-axis label cutoff
- Implemented fuzzy model name matching for pricing
- Added provider colors for all services
- Server-side caching (5-min TTL) for Google Sheets data
- Cache management in Settings dropdown

---

### Phase 4: Reply Rate Tracking ✅
**Goal:** Track when prospects reply to emails

**Implementation:**
- Created Gmail Trigger workflow (`Reply Tracker.json`)
- Detects new emails, matches sender to known leads
- Logs `replied` events to Supabase
- Updates lead status in Google Sheets

### Phase 5: Click Rate Tracking ✅
**Goal:** Track when prospects click links in emails

**Implementation:**
- `/api/track/open` - Tracking pixel endpoint (1x1 GIF)
- `/api/track/click` - Link redirect endpoint with logging
- `Email Tracking Injector.json` - n8n code node to inject tracking into emails
- Click rate displayed on Overview dashboard
- Time series chart for click trends

---

## ⏳ Pending Phases

### Phase 7: Testing & Validation
- Run full workflow tests
- Verify all cost data flows correctly
- End-to-end validation

### Phase 8+: Optional Enhancements
- Custom domain configuration
- Clerk authentication
- Migrate Google Sheets → PostgreSQL

---

## 📁 Key Files & Directories

```
cold-email-dashboard-starter/
├── app/                          # Next.js app router
│   ├── page.tsx                  # Overview dashboard
│   ├── analytics/page.tsx        # Analytics page
│   └── api/                      # API routes
│       ├── cost-events/route.ts  # Cost tracking webhook
│       ├── events/route.ts       # Email events webhook
│       ├── cache/route.ts        # Cache management
│       └── sheets/route.ts       # Google Sheets data
├── components/
│   ├── dashboard/                # Dashboard components
│   │   ├── daily-cost-chart.tsx  # LLM cost chart
│   │   └── timezone-selector.tsx # Timezone picker
│   └── layout/
│       └── header.tsx            # Header with cache mgmt
├── lib/
│   ├── cache.ts                  # Server-side cache
│   ├── constants.ts              # Pricing, colors
│   ├── google-sheets.ts          # Sheets integration
│   ├── supabase.ts               # Supabase client
│   └── utils.ts                  # Helpers
├── cold-email-system/            # n8n workflow JSONs
│   ├── Email Preparation.json    # Main email prep workflow
│   ├── Research Report.json      # Research workflow
│   ├── Email 1.json              # Email 1 sender
│   ├── Email 2.json              # Email 2 sender
│   ├── Email 3.json              # Email 3 sender
│   ├── Opt-Out.json              # Opt-out handler
│   └── Backfill Historical Emails.json
└── docs/
    ├── PROJECT_CONTEXT.md        # THIS FILE
    ├── COST_TRACKING_IMPLEMENTATION_TRANSCRIPT.md
    ├── DEPLOYMENT.md
    └── N8N_CONFIGURATION_GUIDE.md
```

---

## 🔗 Important URLs

| Resource | URL |
|----------|-----|
| Production Dashboard | https://cold-email-dashboard.vercel.app |
| Analytics Page | https://cold-email-dashboard.vercel.app/analytics |
| Cost Events API | https://cold-email-dashboard.vercel.app/api/cost-events |
| Email Events API | https://cold-email-dashboard.vercel.app/api/events |
| GitHub Repo | https://github.com/nishchith-m1015/cold-email-dashboard |
| Vercel Dashboard | https://vercel.com/nishchith-m1015s-projects/cold-email-dashboard |

---

## 🗄️ Supabase Tables

### `email_events`
Tracks email sends, opens, clicks, replies, opt-outs
```sql
- id, event_type, email_address, campaign_name
- sender_email, email_number, subject
- created_at, metadata
```

### `llm_usage`
Tracks LLM and API costs
```sql
- id, provider, model, tokens_in, tokens_out
- cost_usd, campaign_name, contact_email
- purpose, workflow_id, run_id
- created_at, metadata
```

---

## 🔐 Environment Variables

Required in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=https://vfdmdqqtuxbkkxhcwris.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-key>
GOOGLE_SHEET_ID=1AGG05kKt9b-OAN3YGsZ-ZVDFv9fWxEjgWHDDBE2g_C8
GOOGLE_SERVICE_ACCOUNT_JSON=<full-json-one-line>
DASH_WEBHOOK_TOKEN=<your-token>
CACHE_REFRESH_TOKEN=a7k9mQ2xL5pR8vN3jW6sT1yF4hB9cD0eG
```

---

## 📝 n8n Workflow Notes

### Cost Tracking Flow:
1. `💰 Init Cost Tracking` - Initialize `_cost_events` array
2. Each service adds its cost to the array
3. `📊 Send Cost Events to Dashboard` - POST to Vercel API
4. Dashboard displays in real-time

### Webhook URL for all workflows:
```
https://cold-email-dashboard.vercel.app/api/cost-events
```

### Token header:
```
x-webhook-token: 6de5a8d03ad6348f4110782372a82f1bb7c6ef43a8ce8810bf0459e73abaeb61
```

---

## 🐛 Known Issues / Troubleshooting

1. **Costs not showing?** Check Supabase `llm_usage` table directly
2. **Dashboard slow?** Clear cache via Settings → Clear cache & refresh
3. **n8n webhook fails?** Verify the Vercel URL and token header
4. **Charts empty?** Check date range picker - data might be outside range

---

## 📅 Last Updated

**Date:** December 4, 2025  
**Last Phase Completed:** Phase 5 (Click Rate Tracking)  
**Next Phase:** Phase 7 (Testing & Validation)

---

*This file serves as the project memory. Keep it updated as you progress through phases.*

