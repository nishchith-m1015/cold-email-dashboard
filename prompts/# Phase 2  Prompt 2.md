# Phase 2 – LLM + Paid API Cost Tracking (Backend + n8n Only)

You are working inside the **`cold-email-dashboard-starter`** repo I just uploaded.  
Model: **Claude Opus 4.5 (agent mode in Cursor)**.  
Goal of this phase: **make cost tracking rock-solid and complete for every LLM + paid service we actually use**, and keep it perfectly consistent with the docs and n8n workflows.  

---

## 🔭 High-level Objective

In this phase, **do NOT touch the UI layout or dashboard visuals at all**.  
Focus only on:

1. Backend APIs for cost tracking.
2. Pricing + cost calculation logic.
3. n8n workflows under `cold-email-system/`.
4. Keeping everything in sync with the docs in `/docs`.

By the end of this phase:

- Every LLM/API call from n8n (OpenAI, Anthropic, Relevance AI, Google CSE, Apify, OpenRouter if used) should generate a **correct, normalized cost event**.
- `/app/api/cost-events` and `/app/api/llm-usage` should be **fully implemented (no `...` placeholders)** and match the contract described in the docs.
- `LLM_PRICING` and any other pricing logic in `lib/constants.ts` should match `docs/PRICING_CONFIG.md` exactly.
- The system described in `TRACKING_SETUP_COMPLETE.md` should be **actually true in the code + n8n workflows**, not just aspirational.

---

## 🔑 Key Files & Sources (use these as ground truth)

Before making changes, read and respect:

- `TRACKING_SETUP_COMPLETE.md`  
  - Treat this as **the truth about what the system is supposed to do**:
    - Phase 1 – Email Event Tracking (already complete)
    - Phase 2 – LLM Cost Tracking (described as “100% accurate”)
    - Phase 3 – Dashboard Enhancements

- `docs/PRICING_CONFIG.md`  
  - Full pricing table for:
    - OpenAI (o3-mini, chatgpt-4o-latest, etc.)
    - Anthropic (Claude Sonnet 4.5, etc.)
    - Google CSE
    - Apify (Google Maps scrapers, reviews/places)
    - Relevance AI
    - Any notes about my **Apify $39 plan** and per-review/per-place pricing.
  - **All pricing logic in TS must match this. If there’s a conflict, fix the TS to match the doc.**

- `docs/API_REFERENCE.md`  
  - Contract for:
    - `POST /api/cost-events`
    - `POST /api/events`
    - Any metrics endpoints that consume `llm_usage` or cost data.
  - Use this as the canonical JSON schema for cost events.

- `docs/N8N_CONFIGURATION_GUIDE.md` + `docs/START_HERE.md`  
  - How n8n is supposed to call the dashboard endpoints and what headers/tokens to use.
  - Confirm the code and workflows still match this.

- Backend code:
  - `app/api/cost-events/route.ts`
  - `app/api/llm-usage/route.ts`
  - `app/api/metrics/*` (especially anything that reads llm cost data)
  - `lib/constants.ts`
  - `lib/supabase.ts`
  - Any helpers used to format or aggregate costs.

- n8n workflows (JSON):
  - `cold-email-system/Email Preparation.json`
  - `cold-email-system/Research Report.json`
  - Any other workflow that calls LLMs/APIs and **should** emit cost events.

---

## 🎯 Concrete Tasks for Phase 2

### 1. Audit & Fix the Cost Event APIs

**Files to inspect:**

- `app/api/cost-events/route.ts`
- `app/api/llm-usage/route.ts`

**What to do:**

1. **Remove any `...` placeholders and fully implement the logic**:
   - No stubs, no TODOs, no partial branches.
   - The POST handler must:
     - Check `DASH_WEBHOOK_TOKEN` and return 401 on mismatch.
     - Accept **single event** objects **and** arrays of events.
     - Normalize events into a consistent internal type.
     - Support both:
       - **Token-based costs** via `tokens_in` + `tokens_out` + `LLM_PRICING`.
       - **Fixed/derived costs** via `raw_usage` or precomputed `cost_usd`.

2. The event schema should support (and **not silently drop**) at least:
   - `workspace_id` (default → `DEFAULT_WORKSPACE_ID` if missing)
   - `campaign_name`
   - `contact_email`
   - `provider` (e.g. `openai`, `anthropic`, `relevance_ai`, `google_cse`, `apify_reviews`, `apify_places`, `openrouter`, etc.)
   - `model` (matches keys used in `LLM_PRICING` OR is still stored even if not priced)
   - `tokens_in`
   - `tokens_out`
   - `raw_usage` (for things like “number of reviews”, “number of places”, etc.)
   - `purpose` / `metadata` (where we tag things like `workflow_type: 'EmailPreparation'` or `purpose: 'linkedin_scraping'`).

3. Implement the following logic clearly:

   - If `tokens_in`/`tokens_out` is present and `LLM_PRICING[provider][model]` exists:
     - Use `calculateLlmCost` to compute `cost_usd`.
   - Else, if `raw_usage` is present and the provider has special pricing rules (Apify, Google CSE, Relevance AI):
     - Compute cost via specific formulas derived from `docs/PRICING_CONFIG.md`.
     - Example: Apify reviews scraper: `$0.0025 * review_count` (adjust to actual config).
   - If there’s **no known pricing**:
     - Still store the event with `cost_usd = 0` and mark it as `unpriced = true` in a metadata field so the UI can show it later.
     - Do **not** throw hard errors for unknown models; just log and continue.

4. Insert into Supabase using `supabaseAdmin`:
   - Ensure all columns expected in `schema.sql` for the cost table (`llm_usage` / `provider_costs` / etc.) are populated:
     - `workspace_id`
     - `campaign_name`
     - `contact_email`
     - `provider`
     - `model`
     - `tokens_in`
     - `tokens_out`
     - `raw_usage`
     - `cost_usd`
     - `metadata` (JSONB)
     - `created_at` (`NOW()` default is fine if the schema covers it)

5. Return a structured JSON response like:

   ```json
   {
     "success": true,
     "inserted": 3,
     "errors": 0,
     "results": [
       {
         "id": "uuid",
         "provider": "openai",
         "model": "o3-mini",
         "cost_usd": 0.002341
       }
     ],
     "unpriced": []
   }

Make sure error handling:
	•	Aggregates per-event errors in an errors array rather than crashing the whole batch.
	•	Returns 200 if at least one event succeeded, 400 or 500 if all failed.

	6.	For /api/llm-usage:
	•	Either wire it directly to the same logic as /api/cost-events or clearly differentiate:
	•	If used as a lower-level “usage ingest” endpoint, still compute and store cost or delegate into a shared helper.

2. Sync Pricing Logic with PRICING_CONFIG.md

File:
	•	docs/PRICING_CONFIG.md
	•	lib/constants.ts (LLM_PRICING, plus any new structs you add)

What to do:
	1.	Compare every pricing entry in PRICING_CONFIG.md against LLM_PRICING:
	•	Add missing models (e.g. chatgpt-4o-latest, any Anthropic versions listed).
	•	Ensure all prices are per 1K tokens and match the doc.
	•	Normalize model keys so that the same string is used:
	•	If the doc says claude-sonnet-4-5-20250929 but the code/flows use claude-sonnet-4-5, pick a canonical ID and map to it consistently in n8n + backend.
	2.	For non-LLM services (Apify, Google CSE, Relevance AI):
	•	Implement one of:
	•	A separate pricing map like API_PRICING with clear units:
	•	e.g. apify_reviews: { per_review: 0.0025, per_run: 0.007 }
	•	google_cse: { per_search: 0.005 }
	•	relevance_ai: { per_call: 0.10 }
	•	Or add a comment + helper functions if that’s clearer.
	•	Implement helper functions in lib/constants.ts (or a new lib/pricing.ts) like:

export function calculateApifyCost(kind: 'reviews' | 'places', rawUsage: number): number { ... }
export function calculateGoogleCseCost(searchCount: number): number { ... }
export function calculateRelevanceAiCost(callCount: number): number { ... }


	•	These helpers must use the exact formulas/prices from PRICING_CONFIG.md.

	3.	Make sure calculateLlmCost (already imported) is:
	•	Correctly typed, documented, and used everywhere.
	•	Safe for unknown models (log + return 0 instead of throwing).
	4.	Add inline comments in the TS where you reference pricing, pointing back to docs/PRICING_CONFIG.md so future edits stay in sync.

3. Wire All n8n Workflows to Cost Tracking

Files:
	•	cold-email-system/Email Preparation.json
	•	cold-email-system/Research Report.json
	•	Any other JSON in cold-email-system that uses:
	•	OpenAI
	•	Anthropic
	•	Relevance AI
	•	Google CSE
	•	Apify
	•	(Optionally OpenRouter, if used)

What to do conceptually (I will do the JSON edits in Cursor with you):
	1.	For every place we call an LLM or paid API in a workflow:
	•	Confirm there is a Code node or mapping step that:
	•	Reads the provider’s response (usage / tokens / result count).
	•	Builds a cost event matching the CostEventPayload schema.
	•	Sends it to POST {{DASHBOARD_URL}}/api/cost-events with x-webhook-token.
	2.	For Email Preparation:
	•	Ensure all the following are emitting cost events:
	•	Relevance AI (LinkedIn research)
	•	Google CSE (company research)
	•	Apify (reviews / places, if used)
	•	OpenAI o3-mini (summarize + analyze steps)
	•	Anthropic Claude Sonnet 4.5 (email generation)
	•	Each event should include a clear purpose / metadata:
	•	workflow_type: 'EmailPreparation'
	•	purpose: 'linkedin_scraping' | 'company_research' | 'company_summarization' | 'prospect_analysis' | 'email_generation'
	3.	For Research Report:
	•	Do the same: every LLM/API call should emit a cost event.
	•	Tag them with workflow_type: 'ResearchReport' and a specific purpose based on PRICING_CONFIG.md.
	4.	Make sure:
	•	provider and model fields match what LLM_PRICING or the API pricing helpers expect (case + spelling).
	•	raw_usage is set for things like number of reviews or number of search calls.
	•	If the workflow batches cost events:
	•	The HTTP node should send an array to /api/cost-events.
	•	And the API should already handle arrays correctly (you implemented that in step 1).
	5.	Normalize provider naming:
Example mapping (adjust based on what’s currently in the JSON):
	•	provider: "openai" + model: "o3-mini"
	•	provider: "anthropic" + model: "claude-sonnet-4-5"
	•	provider: "relevance_ai" + model: "linkedin_research" (or similar label)
	•	provider: "google_cse" + model: "custom_search"
	•	provider: "apify" + model: "google_maps_reviews" or "google_maps_places"
Make sure these strings are consistent everywhere:
	•	n8n Code nodes
	•	/api/cost-events
	•	LLM_PRICING / API_PRICING
	•	Any dashboard code relying on provider for colors (via getProviderColor).

4. Keep Supabase Schema & Docs in Sync

Files:
	•	schema.sql
	•	Any cost-related references in: docs/ARCHITECTURE.md, docs/API_REFERENCE.md, TRACKING_SETUP_COMPLETE.md

What to do:
	1.	Confirm that the table(s) storing cost events match what the API writes:
	•	Column names, types, defaults.
	•	If something is missing (e.g., raw_usage, metadata), update the schema + mention in TRACKING_SETUP_COMPLETE.md only if the change is essential and minimal.
	2.	Ensure all queries in:
	•	/app/api/metrics/cost-breakdown/route.ts
	•	/app/api/metrics/timeseries/route.ts
	•	Any other metric endpoints that rely on cost data
…are consistent with the final schema.
	3.	If those metrics endpoints currently only understand OpenAI/Anthropic:
	•	Extend them to recognize Apify / Google / Relevance AI / OpenRouter providers and include them in:
	•	per-provider totals
	•	per-model breakdowns
	•	daily cost charts.

⸻

🧱 Constraints
	•	Do NOT change any dashboard layout or styling in this phase:
	•	No edits to React components in app/(dashboard) for charts/cards/layout.
	•	Only backend + pricing + n8n wiring.
	•	Do NOT delete or overwrite docs in /docs.
	•	You can add small clarifying lines if needed, but don’t nuke or rewrite the existing guides.
	•	Respect TRACKING_SETUP_COMPLETE.md as the target state:
	•	If you see a mismatch between that doc and the code/workflows:
	•	Prefer making the code and workflows match the doc.
	•	Only change the doc if there is no other option.

⸻

✅ Definition of Done for Phase 2

Phase 2 is complete when all of these are true:
	1.	app/api/cost-events/route.ts and app/api/llm-usage/route.ts:
	•	No ... placeholders.
	•	Correctly handle both token-based and raw-usage-based costs.
	•	Accept single events and arrays.
	•	Insert into Supabase with correct schema.
	2.	lib/constants.ts (and any new helpers):
	•	LLM_PRICING matches docs/PRICING_CONFIG.md.
	•	Non-LLM services (Apify, Google CSE, Relevance AI) have clear pricing helpers.
	•	Unknown models don’t crash ingestion; they’re stored with cost_usd = 0 and flagged.
	3.	n8n workflows in cold-email-system/:
	•	Every LLM/API call in Email Preparation + Research Report (and any other relevant flows) sends cost events to /api/cost-events.
	•	Provider/model/purpose metadata is consistent and normalized.
	4.	The behavior described as “Phase 2: LLM Cost Tracking (100% ACCURATE)” in TRACKING_SETUP_COMPLETE.md is actually implemented in code and workflows.

⸻

How to Work in Cursor
	1.	Read all the docs listed above so you understand the intended design.
	2.	Open the backend files and implement/fix the cost logic as described.
	3.	Open each n8n JSON workflow in the cold-email-system/ folder and:
	•	Add/adjust Code nodes for cost event generation.
	•	Verify HTTP Request nodes point at /api/cost-events with the correct token.
	4.	Keep changes tightly scoped to cost tracking + pricing + workflows, no UI edits.

When you’re done, the system should be able to tell me, per day and per campaign:
	•	Exactly how much I spent, broken down by provider/model.
	•	Which workflows are responsible for which costs.
	•	That every LLM/API call in the main cold email system is accounted for.

