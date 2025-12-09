### 🔴 Critical Vulnerabilities (Must Fix Immediately)
* **File:** `middleware.ts`
* **Line:** ~15-27
* **Issue:** Public-route matcher includes `/` and `/api/workspaces`, exposing dashboard shell and workspace APIs without Clerk auth; `/api/admin/(.*)` also marked public, relying solely on header tokens. Increases IDOR and token-leak blast radius.
* **Fix:** Restrict `isPublicRoute` to auth pages and tracking/webhook endpoints only; remove `/` and `/api/workspaces` and `/api/admin/(.*)` from the public list so Clerk guards these routes.

* **File:** `app/api/track/open/route.ts` and `app/api/track/click/route.ts`
* **Line:** ~34-98 (open), ~53-88 (click)
* **Issue:** Hardcodes `workspace_id` to `DEFAULT_WORKSPACE_ID`, so opens/clicks from any tenant are written into the default workspace, violating multi-tenant isolation.
* **Fix:** Require `workspace_id` in query params; validate and write using that workspace. Reject missing/invalid workspace IDs.

* **File:** `supabase/schema.sql`
* **Line:** ~1-220
* **Issue:** Schema omits `campaigns` table and materialized view definitions (`mv_daily_stats`, `mv_llm_cost`) referenced by code/docs; missing objects cause runtime failures or force slower/raw queries lacking intended isolation/perf.
* **Fix:** Add migrations to create `campaigns` and both views with refresh RPC; apply RLS (or secure RPC) for tenant isolation.

* **File:** `lib/supabase.ts` vs `supabase/schema.sql`
* **Line:** ~75-141
* **Issue:** Types declare `campaign_id` and `step` on `EmailEvent`/`DailyStats`, but schema has `campaign_name` (NOT NULL) and `email_number` instead, no `campaign_id`. Type/DB divergence risks silent runtime bugs and mis-mapped fields.
* **Fix:** Align types to schema or extend schema with `campaign_id`/`step` columns and backfill; otherwise rename code to use `email_number` consistently and match nullability.

* **File:** `app/api/events/route.ts`
* **Line:** ~107-150
* **Issue:** (Fixed) now requires `idempotency_key` and defaults metadata to `{}`. If payloads still diverge from docs, surface 400s for missing keys.
* **Fix:** Already applied: enforce key, dedupe by workspace + key, keep metadata as object.

### 🟡 Integration Discrepancies (N8N/Supabase)
* **Component:** `/api/events` vs `docs/n8n/N8N_WEBHOOK_SETUP_GUIDE.md`
* **Mismatch:** Guide includes `idempotency_key`, `workspace_id`, `n8n_execution_id`, and `message_id`; API validates `provider_message_id` (optional), ignores `idempotency_key`, and defaults workspace to `DEFAULT_WORKSPACE_ID`. Step stored as `email_number` in DB while code uses `step`.

* **Component:** Tracking endpoints
* **Mismatch:** Guide implies workspace-aware tracking; open/click routes never accept `workspace_id` and always log to default workspace.

* **Component:** Materialized views
* **Mismatch:** Docs reference `mv_daily_stats` / `mv_llm_cost`; schema lacks view definitions. Code paths expecting views may fail or fall back.

### 🔵 UX & State Fragility
* **Component:** `hooks/use-dashboard-data.ts` + `components/dashboard/workspace-switcher.tsx`
* **Scenario:** Rapid workspace switching shows stale metrics because SWR keeps previous data and `summaryLoading` is suppressed once data exists.
* **Recommendation:** On workspace change, clear cached data for the prior workspace or introduce a “switching” flag to force loading placeholders until the new response lands.

* **Component:** `components/dashboard/metric-card.tsx`
* **Scenario:** During refetch with cached data, cards display old values with no “updating” indicator.
* **Recommendation:** Add an `isRefetching` prop from the hook (e.g., detect SWR revalidation) to render a subtle loading/updating state during refetches.


