### 🔴 Critical Vulnerabilities (Must Fix Immediately)
* **File:** `middleware.ts`
* **Line:** ~15-27
* **Issue:** Public-route matcher includes `/` and `/api/workspaces`, so unauthenticated users can hit workspace creation/list APIs and the root dashboard shell before Clerk auth. Admin routes are also marked public, relying only on header tokens and skipping Clerk, increasing IDOR risk if tokens leak.
* **Fix:** Remove `/` and `/api/workspaces` from `isPublicRoute`; only auth pages and tracking/webhook endpoints should be public. Remove `/api/admin/(.*)` from public list so Clerk auth wraps admin routes before token checks.

* **File:** `app/api/track/open/route.ts` and `app/api/track/click/route.ts`
* **Line:** ~34-98 (open), ~53-88 (click)
* **Issue:** Events are written with `workspace_id` forced to `DEFAULT_WORKSPACE_ID`, ignoring per-tenant IDs. Any tracked link/open is attributed to the default workspace, enabling cross-tenant data pollution.
* **Fix:** Require and validate `workspace_id` from query params; reject if missing. Pass through to contact upsert and event insert with RLS-aware workspace scoping.

* **File:** `supabase/schema.sql`
* **Line:** ~1-220
* **Issue:** Schema lacks the `campaigns` table and all materialized view definitions (`mv_daily_stats`, `mv_llm_cost`) that the code and docs expect. Relying code may query non-existent structures, causing runtime failures or falling back to raw tables without RLS-hardened aggregation.
* **Fix:** Add migrations that create `campaigns` (id/workspace_id/name/status/created_at) and the two materialized views with refresh function; ensure RLS on `campaigns` and views or secure RPC wrappers.

* **File:** `lib/supabase.ts` vs `supabase/schema.sql`
* **Line:** ~75-141
* **Issue:** Types assume `campaign_id`, `step`, and nullable `campaign_name` on `EmailEvent`/`DailyStats`, but schema uses `campaign_name` (NOT NULL) and `email_number` instead of `step`, with no `campaign_id` column. Type/DB mismatch can hide runtime errors and mis-map fields.
* **Fix:** Align types to schema or add columns (`campaign_id`, `step`) and backfill; alternatively, rename code to use `email_number` consistently and enforce NOT NULL/NULLability parity.

* **File:** `app/api/events/route.ts`
* **Line:** ~107-150
* **Issue:** (Fixed) now enforces `idempotency_key`, defaults metadata to `{}`. If further mismatches: ensure docs/payloads align and surface 400s for missing keys.
* **Fix:** Already applied: require `idempotency_key`, dedupe by workspace + key, metadata defaults to `{}`.

### 🟡 Integration Discrepancies (N8N/Supabase)
* **Component:** Webhook payload vs `/api/events`
* **Mismatch:** n8n guide includes `idempotency_key`, `workspace_id`, `n8n_execution_id`, and uses `message_id`; the API schema validates `provider_message_id` (optional), ignores `idempotency_key`, and defaults workspace to `DEFAULT_WORKSPACE_ID`. Step is expected but stored as `email_number` in DB.

* **Component:** Tracking endpoints vs n8n guide
* **Mismatch:** Guide implies workspace-aware tracking; endpoints hardcode `DEFAULT_WORKSPACE_ID` and don’t accept `workspace_id`, risking cross-tenant contamination.

* **Component:** Materialized views
* **Mismatch:** Docs/roadmap reference `mv_daily_stats` and `mv_llm_cost`; schema file does not define them. If code queries views, it will fail or fall back silently.

### 🔵 UX & State Fragility
* **Component:** `hooks/use-dashboard-data.ts` + `components/dashboard/workspace-switcher.tsx`
* **Scenario:** Fast workspace switching keeps prior data visible because SWR `keepPreviousData` and `summaryLoading` are gated by presence of previous data; users may see stale metrics for a moment.
* **Recommendation:** On workspace change, reset cached data (keyed by workspace_id) or set an explicit “switching” state that forces loading placeholders until the new workspace data arrives.

* **Component:** `components/dashboard/metric-card.tsx`
* **Scenario:** Loading state only triggers when `loading` prop is true; during refetch with existing data, cards show stale values with no “updating” hint.
* **Recommendation:** Pass an `isRefetching` flag from the hook (e.g., `aggregateLoading && summary`) and render a subtle updating state/skeleton to avoid stale impressions.


