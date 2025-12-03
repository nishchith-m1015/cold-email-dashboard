
# Architecture (Blueprint)

**Data flow**
n8n → `/events` (backend) → Postgres tables (`emails`, `email_events`, `daily_stats`, `provider_costs`).
Frontend reads from API routes:

- `/api/metrics/summary?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `/api/metrics/timeseries?metric=reply_rate|sends|opt_out_rate&interval=day&start=&end=`
- `/api/ask` (AI Q&A over metrics; generates whitelisted SQL and returns a friendly answer)

**Tables**
See `schema.sql` for the normalized model.

**Idempotency**
Store a unique `event_key` (e.g., `${provider}:${message_id}:${event_type}`) in `email_events`. Reject duplicates.

**Security**
Enable auth (Supabase Auth or NextAuth) and check a session in API routes. Start public while testing.
