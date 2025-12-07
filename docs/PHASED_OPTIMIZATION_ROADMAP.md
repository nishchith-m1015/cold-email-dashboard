# 🚀 Master Optimization Roadmap: Phases 7-15

**Strategy:** "Atomic Updates." Each phase is isolated. We verify functionality before moving to the next.
**Goal:** A sub-100ms dashboard that handles 100k+ leads without breaking.

---

## 🏎️ Part 1: Deep Performance (The Core)

### Phase 7: Database Materialization (Server Speed)
**Objective:** Stop calculating "Total Cost" from scratch on every page load.
- [ ] **7a: Migration File:** Create `supabase/migrations/20251207_materialized_views.sql`.
- [ ] **7b: Create Views:** Define `mv_daily_stats` and `mv_llm_costs` grouping by day/campaign.
- [ ] **7c: Refresh Logic:** Write a PostgreSQL function `refresh_dashboard_stats()` to update views.
- [ ] **7d: API Update:** Switch `app/api/dashboard/aggregate/route.ts` to query the *Views* instead of raw tables.
- [ ] **Validation:** Verify API response time drops from ~800ms to <100ms.

### Phase 8: Advanced Caching Strategy (Network Speed)
**Objective:** Minimize "Loading..." spinners.
- [ ] **8a: React Query / SWR Tuning:** Increase `dedupingInterval` to 5 minutes for "Static" data (Campaign names).
- [ ] **8b: LocalStorage Persistence:** Persist `dashboard_cache` to LocalStorage so it loads instantly on refresh (even before network).
- [ ] **8c: Optimistic UI:** When changing date range, keep displaying the old data with a "Updating..." toast instead of a white screen.
- [ ] **Validation:** Clicking "Refresh" shows data instantly from LocalStorage.

### Phase 9: Bundle & Render Optimization (Browser Speed)
**Objective:** Reduce the JavaScript bundle size.
- [ ] **9a: Lazy Load Charts:** Wrap `Recharts` components in `next/dynamic` or `React.lazy`.
- [ ] **9b: Code Splitting:** Ensure "Settings" and "Profile" code isn't loaded on the Dashboard page.
- [ ] **9c: Font Optimization:** Verify `next/font` is being used correctly to prevent layout shift.
- [ ] **Validation:** Run Lighthouse score. Aim for >90 Performance.

---

## 🧠 Part 2: Intelligence & Data Logic

### Phase 10: Robust Data Ingestion
**Objective:** Stop "No Reviews" bugs forever.
- [ ] **10a: n8n Webhook Queue:** Implement a Supabase Edge Function queue for incoming n8n webhooks to handle bursts.
- [ ] **10b: Idempotency:** Add `event_id` checks to `route.ts` to prevent double-counting if n8n retries a request.
- [ ] **Validation:** Send the same webhook 5 times; ensure stats only count it once.

### Phase 11: Advanced Analytics Features
**Objective:** Deeper insights.
- [ ] **11a: Trend Lines:** Add "vs previous period" dotted lines to the main Time Series chart.
- [ ] **11b: Campaign Comparison:** Allow selecting 2 campaigns to graph side-by-side.
- [ ] **11c: Weekday Analysis:** New chart: "Best Day to Send" (Heatmap of Reply Rate by Day of Week).
- [ ] **Validation:** Compare two campaigns and verify the "Winner" logic works.

### Phase 12: Cost Forecasting & Alerts
**Objective:** Prevent billing surprises.
- [ ] **12a: Budget Limits:** Add a "Monthly Budget" setting in the DB.
- [ ] **12b: Alert Logic:** Create an API route that checks if `current_spend > 80% of budget` and emails you.
- [ ] **Validation:** Set budget to $1; trigger an event; check if alert email fires.

---

## 🛡️ Part 3: Reliability & Infrastructure

### Phase 13: Error Boundaries & Recovery
**Objective:** If one chart crashes, the dashboard stays alive.
- [ ] **13a: Component Isolation:** Wrap each KPI card and Chart in a separate `<ErrorBoundary>`.
- [ ] **13b: Fallback UI:** Design a "Data Unavailable" empty state for each component type.
- [ ] **Validation:** Manually throw an error in one chart; ensure the rest of the page loads fine.

### Phase 14: Automated Testing (Safety Net)
**Objective:** Never ship a broken update again.
- [ ] **14a: Unit Tests:** Write Jest tests for `calculateLlmCost` and `useDashboardData`.
- [ ] **14b: E2E Tests:** Set up Playwright to visit the dashboard, click "Analytics," and verify charts load.
- [ ] **Validation:** Run `npm run test` before every commit.

### Phase 15: Multi-Tenant Hardening (Future Proofing)
**Objective:** Prepare for selling this as a SaaS.
- [ ] **15a: RLS Audit:** Review every Supabase Row Level Security policy.
- [ ] **15b: Tenant Isolation:** Ensure `workspace_id` is mandatory on EVERY database query.
- [ ] **Validation:** Log in as User B; try to access User A's data via API; confirm 403 Forbidden.

---

## 🔁 Execution Workflow (The "Safety Protocol")

1.  **Select a Phase:** Do NOT start Phase 8 until Phase 7 is 100% done and verified.
2.  **Context Sync:** Before starting, run `@sync-handoff` in Cursor.
3.  **Implement:** Use the specific prompts provided for that phase.
4.  **Verify:** Check the "Validation" checkbox for that phase.
5.  **Commit:** `git commit -m "feat: complete phase X"`