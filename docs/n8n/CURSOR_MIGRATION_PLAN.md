# 🚀 Phase 16+: Core Features & Scale Strategy

**Context:**
We have completed Phase 14 (Testing) and the dashboard is stable.
We are now migrating development back to **Cursor**.
This roadmap addresses the "Sticky Note" feature requests and the "Multi-Tenant" scaling architecture.

---

## 🧠 Part 1: Intelligence & Automation (n8n)

### Phase 16: Research Quality Audit (Google CSE)
**Goal:** Verify if Google CSE is good enough or if we need to switch to Perplexity/Tavily.
**Context:** `cold-email-system/Email Preparation v2.json` uses Google CSE.
- [ ] **16a: Accuracy Log:** Update the n8n workflow to log the *raw* Google CSE snippets into a new Supabase table `research_logs`.
- [ ] **16b: Quality Audit:** Create a script to compare "Generated Research Summary" vs "Raw Snippets" to see if the LLM is hallucinating due to bad search results.
- [ ] **16c: Optimization:** Tune the Google CSE query logic (in the n8n Code Node) to target "About Us" and "Pricing" pages specifically.

### Phase 17: "Ask AI" Functionality
**Goal:** Make the `/api/ask` endpoint actually smart.
**Context:** Currently, it returns hardcoded dummy responses.
- [ ] **17a: RAG Pipeline:** Connect `/api/ask` to OpenAI (GPT-4o).
- [ ] **17b: Context Injection:** Dynamically fetch the current view's `daily_stats` and `llm_usage` and inject them into the system prompt as JSON.
- [ ] **17c: Natural Language SQL:** (Optional) Allow the AI to query the database directly for complex questions.

---

## ⚡ Part 2: Dashboard Core Features

### Phase 18: Notification System
**Goal:** Real-time alerts for critical events.
- [ ] **18a: Notification Store:** Create a `notifications` table in Supabase (user_id, message, type, read_at).
- [ ] **18b: Trigger Logic:** Create Database Triggers to insert notifications when:
    - A lead replies (`email_events.event_type = 'replied'`).
    - A daily budget is exceeded.
- [ ] **18c: UI Component:** Connect the "Bell" icon in `Header` to a live subscription (Supabase Realtime) of the `notifications` table.

### Phase 19: UX Polish (Search & Timezone)
**Goal:** Make the top bar functional.
- [ ] **19a: Global Search:** Implement `cmdk` (Command K) logic to search for **Campaigns** and **Contacts** via API.
- [ ] **19b: Timezone Auto-Detect:** Update `TimezoneSelector` to default to `Intl.DateTimeFormat().resolvedOptions().timeZone` on first load.
- [ ] **19c: Functional Dropdown:** Ensure changing the timezone re-queries the `daily_stats` API with the correct offset (adjusting the `day` buckets).

### Phase 20: Monthly Projection Logic
**Goal:** Fix the projection math logic (Note 4).
- [ ] **20a: Logic Update:** Refactor `useDashboardData.ts` -> `monthlyProjection`.
    - *Old Logic:* Projects based on selected date range.
    - *New Logic:* Always fetch `current_month_to_date` cost. Calculate `daily_average = cost / days_passed_in_month`. Project `end_of_month = daily_average * days_in_month`.
- [ ] **20b: UI Update:** Add a Tooltip (Hover) to the KPI card: *"Projection based on current month's daily average usage."*

---

## 🔐 Part 3: Multi-Tenancy & Scaling

### Phase 21: Workspace Architecture (The Big One)
**Goal:** Allow users to create/join workspaces securely (Note 2 & 3).
**Constraint:** Do NOT duplicate tables. Use `workspace_id`.
- [ ] **21a: Workspace Table:** Ensure `workspaces` table tracks `owner_id` and `members`.
- [ ] **21b: Invite System:** Create an API `/api/workspaces/invite` to send email invites (via Resend/SendGrid).
- [ ] **21c: Onboarding Flow:** When a new Clerk user signs up:
    - Check if they have a pending invite (by email).
    - If yes -> Add to existing workspace.
    - If no -> Create new "Personal Workspace" and make them Owner.
- [ ] **21d: RLS Hardening:** Audit `schema.sql` to ensure **every single policy** checks `auth.uid()` against the `workspace_members` table.

---

## 📝 Execution Protocol for Cursor

1.  **Copy this file** to `docs/CURSOR_MIGRATION_PLAN.md`.
2.  **Commit & Push** your current VS Code work.
3.  **Open Cursor.**
4.  **Prompt:** "@PlanMode Read `docs/CURSOR_MIGRATION_PLAN.md`. We are starting **Phase 16**. Analyze the `Email Preparation v2.json` file and plan the logging table."