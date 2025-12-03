# Cold Email Analytics Dashboard

A beautiful, real-time analytics dashboard for tracking your n8n cold email campaigns. Built with Next.js 14, Tailwind CSS, Supabase, and Recharts.

![Dashboard Preview](./docs/preview.png)

## Features

- 📊 **Real-time Metrics** - Track sends, replies, opt-outs, and bounce rates
- 💰 **Cost Analytics** - Monitor LLM costs by provider and model
- 📈 **Time Series Charts** - Visualize trends over customizable date ranges
- 🏢 **Multi-Campaign Support** - Filter and compare campaigns
- 🤖 **AI Insights** - Ask natural language questions about your data
- ⌨️ **Command Palette** - Quick navigation with Cmd+K
- 🌙 **Beautiful Dark Theme** - Modern, eye-friendly UI

## Quick Start

### 1. Set up Supabase

1. Create a new [Supabase](https://supabase.com) project
2. Go to the SQL Editor and run the contents of `schema.sql`
3. Get your project URL and service role key from Settings > API

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DASH_WEBHOOK_TOKEN=your-random-webhook-token-here
```

Generate a secure webhook token:
```bash
openssl rand -hex 32
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## n8n Integration

### Add to n8n Environment

Set these environment variables in your n8n instance:

```
DASHBOARD_URL=https://your-dashboard-domain.com
DASH_WEBHOOK_TOKEN=same-token-as-above
```

### Log Email Events

After each email send in your n8n workflows, add an HTTP Request node:

```json
POST {{ $env.DASHBOARD_URL }}/api/events
Headers:
  X-Webhook-Token: {{ $env.DASH_WEBHOOK_TOKEN }}
  Content-Type: application/json

Body:
{
  "contact_email": "{{ $json.Email }}",
  "campaign": "Real Estate CA",
  "step": 1,
  "event_type": "sent",
  "provider": "gmail",
  "provider_message_id": "{{ $json.id }}",
  "event_ts": "{{ $now }}"
}
```

Event types: `sent`, `delivered`, `replied`, `opt_out`, `bounced`

### Log LLM Usage

After LLM calls in your workflows:

```json
POST {{ $env.DASHBOARD_URL }}/api/llm-usage
Headers:
  X-Webhook-Token: {{ $env.DASH_WEBHOOK_TOKEN }}
  Content-Type: application/json

Body:
{
  "campaign": "Real Estate CA",
  "provider": "openai",
  "model": "o3-mini",
  "tokens_in": {{ $json.usage.prompt_tokens }},
  "tokens_out": {{ $json.usage.completion_tokens }},
  "contact_email": "{{ $json.Email }}"
}
```

## API Reference

### Ingestion Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | POST | Log email events (sent, replied, etc.) |
| `/api/llm-usage` | POST | Log LLM token usage and costs |

### Metrics Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics/summary` | GET | Aggregate stats with comparisons |
| `/api/metrics/timeseries` | GET | Daily data points for charts |
| `/api/metrics/by-campaign` | GET | Stats broken down by campaign |
| `/api/metrics/cost-breakdown` | GET | LLM costs by provider/model |
| `/api/campaigns` | GET | List of campaigns |
| `/api/ask` | POST | AI-powered insights |

### Query Parameters

Most metrics endpoints accept:
- `start` - Start date (YYYY-MM-DD)
- `end` - End date (YYYY-MM-DD)
- `campaign` - Filter by campaign name
- `workspace_id` - Filter by workspace (for multi-tenant)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Data Fetching**: SWR
- **Animations**: Framer Motion
- **UI Components**: Radix UI
- **Tables**: TanStack Table
- **Icons**: Lucide React

## Project Structure

```
cold-email-dashboard-starter/
├── app/
│   ├── api/
│   │   ├── events/           # Event ingestion
│   │   ├── llm-usage/        # Cost ingestion
│   │   ├── metrics/          # Analytics queries
│   │   ├── campaigns/        # Campaign list
│   │   └── ask/              # AI insights
│   ├── analytics/            # Analytics page
│   ├── page.tsx              # Dashboard home
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind + custom styles
├── components/
│   ├── ui/                   # Base components
│   ├── dashboard/            # Dashboard-specific
│   └── layout/               # Layout components
├── hooks/                    # SWR hooks
├── lib/                      # Utilities
│   ├── supabase.ts           # DB client
│   ├── utils.ts              # Helpers
│   └── constants.ts          # Config
└── schema.sql                # Database schema
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Self-Hosted

```bash
npm run build
npm start
```

## License

MIT
