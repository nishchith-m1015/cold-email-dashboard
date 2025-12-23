# Cold Email System - n8n Workflows

This folder contains exported n8n workflow JSON files for the cold email automation system.

## ⚠️ Security Notice

**These workflow files may contain:**
- Credential IDs (not secrets, but can reveal your setup)
- Webhook URLs
- Sample data from test runs

**Before sharing or committing:**
1. Remove any test data from workflow nodes
2. Clear execution history data
3. Use generic credential names

## Workflow Files

| File | Purpose |
|------|---------|
| `Email 1.json` | Initial outreach email workflow |
| `Email 2.json` | First follow-up workflow |
| `Email 3.json` | Final follow-up workflow |
| `Reply Tracker.json` | Gmail inbox monitoring for replies |
| `Opt-Out.json` | Unsubscribe webhook handler |
| `Email Tracking Injector.json` | Adds tracking pixels to emails |
| `Email Preparation.json` | Prepares email content |
| `Research Report.json` | Generates prospect research |
| `Backfill Historical Emails.json` | Migrates historical data |
| `Backfill Sheets to Supabase.json` | Google Sheets → Supabase migration |
| `Retrieve Message IDs for Email #1.json` | Gets Gmail message IDs |

## Setup Instructions

1. Import each workflow into your n8n instance
2. Create required credentials:
   - **PostgreSQL**: Your Supabase connection
   - **Gmail OAuth2**: Your sending Gmail account
3. Update webhook URLs to point to your dashboard
4. Set the `DASH_WEBHOOK_TOKEN` in workflow HTTP Request nodes

## Required Environment

- n8n instance (self-hosted or cloud)
- Supabase database with schema applied
- Gmail account with OAuth2 configured
- Dashboard deployed with webhook endpoints
