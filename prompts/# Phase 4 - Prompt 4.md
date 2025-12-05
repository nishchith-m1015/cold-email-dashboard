# Phase 4 – Advanced Analytics UX, Multi-Workspace, Auth & Billing Foundations

You are working inside the **latest `cold-email-dashboard-starter` repo** (the one I just uploaded and pushed to GitHub/Vercel).

Assume:

- Phase 1 (frontend structure/types, `useDashboardData`, layout shell) is done.
- Phase 2 (full LLM + paid API cost tracking) is done.
- Supabase is already wired and powering the dashboard.
- The current UI is “good enough” visually; now we care about **power, clarity, and multi-tenant productization**.

Your job in this phase:

> Make the dashboard feel like a real SaaS product: deeper analytics UX, real filters, per-sender breakdowns, true multi-workspace behavior, Clerk-based auth, and the foundation for workspace-level billing.  
> Keep everything coherent, fast, and safe.

---

## 0. Constraints and Non-Goals

1. Do not break production:
   - Current deployment on Vercel must continue to work.
   - Do not rename environment variables.
   - Do not touch CI/deployment config unless absolutely necessary.

2. Respect existing architecture and docs:
   - There are already docs for Clerk integration, pricing, n8n, and tracking.
   - Use those docs as the source of truth for how auth and cost tracking must work.
   - Do not rewrite or delete existing docs; only extend/update when behavior truly changes.

3. UI scope:
   - You may add new components, controls, and panels that extend the existing dashboard.
   - You may refine layout within existing patterns (e.g., new cards, new charts, new panels).
   - Do not redesign the entire dashboard theme, typography, or branding.

4. Data scope:
   - Supabase remains the canonical source of truth for metrics and cost data.
   - n8n remains the primary ingestion engine for email events and costs.
   - Do not re-introduce Google Sheets as a direct metrics source.

---

## 1. Deeper Analytics UX (Still Using Existing Data)

Goal: The dashboard should give richer, more actionable insight without new data sources.

Focus on using the **data that already exists** (email events, steps, campaigns, senders, LLM usage) and exposing it in a more useful way.

Key improvements:

1. Per-step (Email 1/2/3/…) analytics:
   - Show sends, replies, reply rate, opt-outs, and opt-out rate per step.
   - Allow the user to see how Email 1 vs Email 2 vs Email 3 are performing.
   - Integrate this into the existing dashboard, not as a separate “lab” page.

2. Per-day and time-of-send insights:
   - Fix any remaining issues where the calendar or date selection shows the same number for all days.
   - Make sure the dashboard can tell the user:
     - How many emails were sent each day in the selected range.
     - When bursts or lulls happened.
   - Surface this clearly in the existing calendar/time-series components.

3. Campaign-level deep dive:
   - For a selected campaign, show:
     - Top-level KPIs (sends, replies, reply rate, cost per reply).
     - Step-level performance.
     - Cost attribution by provider/model for that campaign.
   - Use existing components where possible; don’t reinvent them if they already exist.

4. Efficiency metrics powered by real data:
   - Ensure “Efficiency Metrics” (cost per reply, monthly projection, contacts reached, etc.) use real Supabase + cost data.
   - If any of these are still using static or mock values, replace them with real data from Supabase.

The UX goal: the user should be able to answer, from the dashboard alone:  
“Which campaign, step, and day are actually working, and how much is it costing me?”

---

## 2. Filters and Controls (Date, Campaign, Sender, Provider)

Goal: Make the dashboard feel like a serious analytics tool with real filtering options.

Add or refine the following filters in a way that feels consistent with the existing design:

1. Date range filter:
   - Ensure the date picker/date range control correctly drives all metrics and charts.
   - Make sure all metrics endpoints and hooks respect the selected date range consistently.

2. Campaign filter:
   - Allow selection of:
     - All campaigns combined.
     - Individual campaigns.
   - Ensure all metrics (top KPIs, step breakdown, cost breakdowns, time-series) update properly when the selected campaign changes.

3. Sender filter:
   - Allow filtering by “sender email” or sending identity, if this is present in the data.
   - If sender data is stored (e.g., in email events or a separate table), expose it as:
     - A dropdown, search box, or pill selector.
   - All metrics should adjust to reflect only data for the selected sender.

4. Provider filter (optional but ideal):
   - Allow the user to focus analytics on:
     - All providers
     - Specific providers (OpenAI, Anthropic, Relevance AI, Google CSE, Apify, OpenRouter)
   - At minimum, the cost analytics panels should respect this filter.

5. Filter state management:
   - Make sure filter state is:
     - Centralized enough that all dashboard sections stay in sync.
     - Storable/restorable per user session if appropriate (e.g. via URL params or React state).
   - Avoid duplicated filter logic in multiple components; prefer a shared hook or context.

The UX goal: the user should be able to slice the data by time, campaign, sender, and (ideally) provider without things getting out of sync.

---

## 3. Per-Sender Breakdown and Insights

Goal: Give clear visibility into which senders are performing best and where they are costing money.

Using existing data:

1. Build a per-sender stats view:
   - For each sender (e.g. `name@domain.com`), show:
     - Total sends
     - Replies
     - Reply rate
     - Opt-outs
     - Cost attributed to that sender (based on LLM/API usage for their campaigns, if possible)
   - This can be a table, chart, or a set of cards, consistent with the rest of the UI.

2. Integrate per-sender metrics into the main dashboard:
   - Either as a dedicated panel or as a toggle within an existing section.
   - Make sure it respects all filters:
     - Date range
     - Campaign
     - Provider (if implemented)

3. Keep aggregation logic on the backend where possible:
   - Do not pull huge raw datasets into the frontend and aggregate there.
   - Use Supabase queries and metrics endpoints to return per-sender aggregates.

4. Ensure drill-down behavior makes sense:
   - If you include links or actions (for example “View this sender’s performance”), they should re-use existing patterns and not create conflicting navigation flows.

The UX goal: the user can immediately see which sending identities are actually performing and which are dragging down results.

---

## 4. Productizing Multi-Workspace

Goal: Move from a “one big workspace with a default id” mindset to a **real multi-workspace / multi-tenant design**, even if tenants are still few.

Use the existing data model and enhance it minimally but correctly:

1. Workspace modeling:
   - Confirm there is a `workspaces` table and a `DEFAULT_WORKSPACE_ID` pattern.
   - Make sure all key tables (email events, llm usage, campaigns, etc.) have a workspace reference.

2. Workspace scoping:
   - Ensure all metrics and events queries are scoped by workspace id.
   - Remove or avoid any hard-coded “default workspace” behaviour in production code, except as a fallback for local/dev testing.

3. Workspace awareness in the dashboard:
   - Internally, wire the app so that the currently selected workspace id is always known.
   - Even if the UI currently only uses a single workspace:
     - Design the hooks/endpoints to accept a workspace id.
     - Make it easy to plug in a workspace switcher later.

4. Isolation and safety:
   - A user in workspace A must never see data from workspace B.
   - All queries and mutations must enforce workspace-level filters.

At the end of this step, the code should be ready to support multiple workspaces cleanly, even if the visible UI still shows a single workspace selection.

---

## 5. Clerk Auth Integration (End-to-End, But Minimal UX)

Goal: Wire up real authentication with Clerk using the existing Clerk docs, and connect users to workspaces in a clean, minimal way.

Use the Clerk integration instructions already present in the repo’s docs and ensure:

1. Correct Next.js App Router integration:
   - Use `clerkMiddleware` and `proxy.ts` as specified in the Clerk doc.
   - Wrap `app/layout.tsx` with `<ClerkProvider>`.
   - Use `SignedIn`, `SignedOut`, `UserButton`, etc. in the layout.

2. Route protection:
   - Protect dashboard routes so that:
     - An unauthenticated user sees a sign-in/up experience.
     - An authenticated user can access their own dashboard.
   - Keep public or webhook endpoints (for n8n) accessible where appropriate.

3. User ↔ Workspace mapping:
   - Introduce or complete a mapping from Clerk user id to workspace id(s).
   - On login:
     - Resolve which workspace the user belongs to.
     - Provide that workspace id to the dashboard via context/hook so all queries are scoped correctly.
   - For now, a simple “one user ↔ one workspace” mapping is fine.

4. Avoid auth regressions:
   - Ensure n8n webhooks and any public ingestion routes that depend only on tokens stay functional.
   - Do not accidentally require Clerk auth for server-to-server ingestion endpoints.

The goal here is a clean, correct Clerk integration that establishes user identity and workspace context without overcomplicating the UX.

---

## 6. Billing Foundations (No Stripe Yet, Just Usage + Structure)

Goal: Build the back-end structure and reporting needed for billing, without yet integrating Stripe or payment flows.

Using the existing LLM/API usage and email data:

1. Workspace-level usage aggregation:
   - For each workspace, compute:
     - Monthly total cost (LLM/API usage costs).
     - Monthly email sends.
     - Monthly replies.
   - Build metrics endpoints that can return this per workspace and per month.

2. Plan metadata:
   - Introduce a basic concept of a “plan” for each workspace (e.g. free, trial, paid), even if initially just a text field or enum.
   - Do not enforce limits yet; just store the info.

3. Billing readiness:
   - Ensure that:
     - Workspace-level usage can be retrieved efficiently for a given month.
     - There is a clear place to plug in Stripe or another billing provider later to:
       - Charge based on `cost_usd` + additional metrics if needed.
       - Show upcoming invoices or usage warnings.

4. Data hygiene:
   - Make sure all cost events stored previously are correctly attributed to:
     - A workspace id.
     - A campaign (if applicable).
   - If attribution is missing in some events, decide on sensible defaults and document them.

The goal: if someone needs to build Stripe integration tomorrow, the data and APIs are ready, and billing logic can be layered in without a huge refactor.

---

## 7. Definition of Done for Phase 4

Phase 4 is complete when all of the following are true:

1. Deeper analytics UX:
   - Per-step, per-day, and per-campaign analytics are fully functional and powered by real data.
   - Efficiency metrics and cost panels use correct Supabase and cost data.

2. Filters:
   - Date range, campaign, and sender filters exist and are respected by all major dashboard metrics.
   - Provider filtering is in place for cost analytics, or the system is clearly structured to support it next.

3. Per-sender view:
   - There is a clear per-sender breakdown integrated into the dashboard.
   - It respects the same filters and workspace scoping.

4. Multi-workspace productization:
   - All queries are workspace-scoped.
   - The code is ready for multiple workspaces without cross-tenant leaks.

5. Clerk auth:
   - Clerk is correctly integrated with the App Router.
   - Dashboard routes are protected.
   - Each authenticated user is mapped to a workspace, and all metrics are scoped accordingly.

6. Billing foundations:
   - Workspace-level usage metrics (monthly costs and sends) are available via APIs.
   - There is a basic plan/usage concept at the workspace level.
   - Data is ready for future Stripe or billing integration, without major rework.

---

## 8. How To Work Inside Cursor

1. Read the existing docs: especially the Clerk integration guide, tracking setup, and architecture docs.
2. Inspect how the current dashboard components, hooks, and metrics endpoints are wired.
3. Implement deeper analytics and filters by:
   - Extending metrics endpoints.
   - Wiring hooks to new filters.
   - Updating only the UI surfaces necessary for new analytics.
4. Wire Clerk auth according to the doc, then enforce workspace scoping everywhere.
5. Add workspace-level usage aggregation for billing foundations.
6. Keep all changes coherent, incremental, and consistent with the patterns already used in the project.

Apply all of this directly in the repo, treating this document as your Phase 4 execution spec.