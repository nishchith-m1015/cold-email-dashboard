# PHASE 1 – REFACTOR DASHBOARD CORE (STRUCTURE + TYPES ONLY)

You are a **senior TypeScript/React/Next.js engineer** working inside the repo:  
`cold-email-dashboard-starter`.

This project is already:

- Deployed to **Vercel**
- Pushed to **GitHub**
- Evolving fast, with multiple phases planned (Supabase, n8n cost tracking, Clerk, etc.)

Your job in this phase:

> **Cleanly refactor the dashboard core (data + layout + types) WITHOUT changing behavior or UI, and WITHOUT breaking the existing deployment.**

Do **not** start auth, Supabase migrations, or n8n changes in this phase.  
This is **frontend architecture + type safety only**.

---

## 0. IMPORTANT CONSTRAINTS

Before doing anything:

1. **Do not break production**  
   - Assume the current main branch is deployed to Vercel.
   - Do not rename environment variables.
   - Do not change `vercel.json`, GitHub Actions, or deployment config.

2. **Respect existing docs & plans**  
   - There are docs under `docs/` (e.g. Clerk integration markdown, pricing config, n8n notes, etc.).
   - Do **not** edit the plan/strategy docs in this phase.
   - You may read them for context only.

3. **Preserve current UI & behavior**  
   - No layout redesign.
   - No color/theme changes.
   - No API semantics changes.
   - If the user sees the same date range + campaign, they should see the same numbers as before.

4. **Assume some work may already exist**  
   - Before adding new hooks/components, **check if something similar already exists** (e.g. a partial `useDashboardData`, a `ClientShell`, shared types).
   - If it exists, **refine/extend it** instead of duplicating.

---

## 1. CENTRALIZE DASHBOARD DATA INTO `useDashboardData`

### 1.1. Discover current data flow

1. Inspect the dashboard-related pages:
   - `app/page.tsx` (main dashboard)
   - `app/analytics/page.tsx` (if present)
   - Any other `app/*` pages that show metrics/analytics.

2. Identify all **metrics / analytics hooks** currently used in those pages, for example (names may differ, detect actual ones):
   - `useMetricsSummary`
   - `useTimeSeries`
   - `useCostBreakdown`
   - `useStepBreakdown`
   - `useCampaignStats`
   - `useCampaigns`
   - Any other `useXxxMetrics` or `useXxxAnalytics` hooks.

3. In these pages, find all `useMemo` or inline transforms that:
   - Derive **cost by provider** datasets.
   - Derive **cost by model** datasets.
   - Shape **time-series** data for charts.
   - Filter/group by:
     - `startDate`, `endDate` (ISO strings)
     - `selectedCampaign` or similar campaign filter.

4. Make a mental (or inline code comment) map of:
   - Which backend endpoints each hook calls.
   - How date range + campaign filters are passed through.

### 1.2. Implement or refine `useDashboardData`

1. Check if a `useDashboardData` (or similar) hook already exists:
   - If it **exists**:
     - Open it.
     - Understand its responsibilities and current return shape.
     - Refactor/extend it to fully cover the dashboard’s needs.
   - If it **does not exist**:
     - Create a new hook file, e.g.:
       - `hooks/useDashboardData.ts`
       - or another path consistent with the existing hooks structure.

2. The hook signature should look roughly like:

   ```ts
   interface DashboardParams {
     startDate: string;             // ISO 8601 string
     endDate: string;               // ISO 8601 string
     selectedCampaign?: string | null;
   }

   export function useDashboardData(params: DashboardParams) {
     // implementation
   }

	3.	Inside useDashboardData, call all the existing metric hooks you discovered:
	•	Pass startDate, endDate, and selectedCampaign consistently.
	•	Reuse the existing hooks; do not duplicate fetch logic.
	4.	Move data shaping / transforms from the pages into useDashboardData, including:
	•	useMemo for cost breakdowns (by provider/model).
	•	useMemo for chart-ready time-series.
	•	Any aggregations over arrays from the raw API data.
	5.	Define and return a clean, typed object. Use the real types from the repo (you will define them in step 3), but conceptually something like:

export interface DashboardData {
  // summary
  summary: MetricsSummary | undefined;
  summaryLoading: boolean;
  summaryError: unknown;

  // time-series
  sendsSeries: TimeSeriesPoint[];
  sendsLoading: boolean;
  repliesSeries: TimeSeriesPoint[];
  repliesLoading: boolean;

  // cost
  costByProvider: CostBreakdownItem[];
  costByProviderLoading: boolean;
  costByModel: CostBreakdownItem[];
  costByModelLoading: boolean;

  // steps / funnel
  stepBreakdown: StepBreakdownItem[];
  stepBreakdownLoading: boolean;

  // campaigns
  campaigns: Campaign[];
  campaignsLoading: boolean;
  campaignStats: CampaignStats | undefined;
  campaignStatsLoading: boolean;

  // convenience flags
  isLoading: boolean;
  hasError: boolean;
}

Adjust field names and shapes to match the actual data structures and UI expectations already in the project.

	6.	Do not introduce new backend endpoints for Phase 1:
	•	Only consume what already exists.
	•	The goal is orchestration + structure, not new data.

1.3. Refactor pages to use useDashboardData
	1.	In app/page.tsx and app/analytics/page.tsx (and any other dashboard-like page):
	•	Keep local UI state such as:
	•	startDate, endDate (ISO strings)
	•	selectedCampaign
	•	UI toggles (e.g. mode switches, view switches)
	•	Anything specific to layout/presentation.
	•	Replace multiple metrics hooks with a single call:

const dashboardData = useDashboardData({
  startDate,
  endDate,
  selectedCampaign,
});


	2.	Replace local useMemo usage that transforms metrics for charts/tables with the values returned from useDashboardData.
	3.	Make sure all props passed to components (charts, cards, tables) continue to receive the same shape and semantic meaning as before. If necessary, log or temporarily compare old vs new shapes while refactoring.
	4.	Preserve loading/empty/error behavior:
	•	If previously you used summaryLoading or individual hook flags, now use the corresponding flags from dashboardData.
	•	Avoid overloading the UI with new spinners; the goal is to keep behavior intact.

⸻

2. MOVE CLIENT LOGIC OUT OF app/layout.tsx INTO ClientShell

The app is deployed and will later use Clerk (you already have a Clerk doc under docs/). For that to be clean, app/layout.tsx should be a server component with a thin client shell wrapper.

2.1. Inspect current app/layout.tsx
	1.	Open app/layout.tsx and note:
	•	Is there a "use client" directive?
	•	Which hooks are used (useState, useEffect, etc.)?
	•	What state is managed there (command palette open, theme toggles, any hotkeys, etc.)?
	•	Which layout components are rendered at the root (Header, SideNav, CommandPalette, etc.)?
	2.	Confirm how dark mode / classes are applied to <html> or <body>:
	•	E.g. className="dark" or theme providers.

2.2. Create / refine ClientShell
	1.	Check if a ClientShell (or similar) component already exists.
	•	If yes, open and extend it.
	•	If not, create a new one at a sensible path, e.g.:
	•	components/layout/client-shell.tsx
	2.	Implement ClientShell as a client component:

'use client';

import React from 'react';
// import Header, CommandPalette, etc.

interface ClientShellProps {
  children: React.ReactNode;
}

export function ClientShell({ children }: ClientShellProps) {
  // Move client-side state/logic here:
  // - command palette open state
  // - handlers like onCommandOpen
  // - any other layout-level client state

  return (
    <>
      {/* Header / Nav / Toolbar */}
      {/* Command palette / overlays */}
      <main className="...">
        {children}
      </main>
    </>
  );
}


	3.	Move all client-only logic currently in app/layout.tsx into ClientShell:
	•	useState for command palette or other UI modals.
	•	Event handlers that are purely client-side.
	•	But do not start adding auth logic (Clerk) yet.
	4.	Make sure behavior remains identical:
	•	Command palette opens the same way.
	•	Header interaction works the same.
	•	No visual regressions in layout.

2.3. Turn app/layout.tsx into a clean server layout
	1.	Remove "use client" from app/layout.tsx.
	2.	Wrap children with ClientShell:

import type { Metadata } from 'next';
import { ClientShell } from '@/components/layout/client-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'UpShot Dashboard',         // keep / adjust based on existing
  description: 'Cold email analytics dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark"> {/* or whatever currently used */}
      <body>
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}


	3.	Preserve:
	•	Any <html> attributes (lang, className for dark mode, etc.).
	•	Any <body> classes or providers that must remain server-side.
	4.	Don’t introduce new providers or wrappers in this phase; just restructure.

⸻

3. ADD SHARED API TYPES & APPLY THEM TO HOOKS

The project already uses metrics/analytics endpoints and React Query (or similar). Phase 1 should solidify types so later Supabase + n8n + Clerk work is safe.

3.1. Create or extend a shared types file
	1.	Look for existing type definitions, for example:
	•	lib/types.ts
	•	lib/dashboard-types.ts
	•	types/*.ts
	2.	If there is already a file for metrics/dashboard types, extend it. If not, create something like:
	•	lib/dashboard-types.ts
	•	Or lib/types.ts if that’s how the repo is organized.
	3.	Define interfaces based on the actual API responses and existing usage in code. For example (adapt to real shapes):

export interface MetricsSummary {
  totalSends: number;
  totalReplies: number;
  totalOptOuts: number;
  replyRate: number;       // 0–1 or percentage: match existing usage
  optOutRate: number;
  totalCostUsd: number;    // if used in UI
}

export interface TimeSeriesPoint {
  date: string;            // ISO 8601 date
  value: number;
}

export interface CostBreakdownItem {
  label: string;           // provider/model name
  value: number;           // cost in USD
}

export interface StepBreakdownItem {
  step: number;            // 1,2,3...
  sent: number;
  replies: number;
  optOuts: number;
  replyRate: number;
  optOutRate: number;
}

export interface Campaign {
  id: string;
  name: string;
  // add any other fields you actually use in UI
}

export interface CampaignStats {
  campaignId: string;
  sends: number;
  replies: number;
  replyRate: number;
  costUsd: number;
  // match actual usage
}


	4.	If you notice inconsistencies between different API routes and how the UI treats them, standardize types on the TypeScript side and only minimally normalize in the hooks (don’t rewrite backend in this phase).

3.2. Apply types to metrics hooks
	1.	For each custom hook that fetches metrics, update it to use proper generics:

import { useQuery } from '@tanstack/react-query';
import type { MetricsSummary } from '@/lib/dashboard-types';

export function useMetricsSummary(params: { startDate: string; endDate: string; campaign?: string | null }) {
  return useQuery<MetricsSummary>({
    queryKey: ['metrics-summary', params],
    queryFn: async () => {
      const res = await fetch(/* existing URL with params */);
      if (!res.ok) throw new Error('Failed to fetch metrics summary');
      return res.json();
    },
  });
}


	2.	Repeat for:
	•	useTimeSeries → TimeSeriesPoint[]
	•	useCostBreakdown → CostBreakdownItem[]
	•	useStepBreakdown → StepBreakdownItem[]
	•	useCampaigns → Campaign[]
	•	useCampaignStats → CampaignStats (or CampaignStats[], depending on how it’s used)
	3.	Fix any TypeScript errors caused by tightening types:
	•	Prefer minimal, explicit fixes over loosening types to any.
	•	If necessary, add small helper functions that map raw API output to the typed shape.
	4.	Ensure useDashboardData uses these types for its return type, so all downstream dashboard components benefit from type safety.

⸻

4. WHAT YOU MUST NOT DO IN PHASE 1
	•	Do NOT:
	•	Modify or add Clerk integration (even though there’s a Clerk doc).
	•	Change environment variable names (this could break Vercel / GitHub).
	•	Modify any n8n-related code, workflow JSON, or cost-tracking logic.
	•	Change Supabase schema or database access code.
	•	Edit strategic docs / plan markdown files.
	•	Do NOT change:
	•	Visual design (colors, spacing, card structure, chart style).
	•	API semantics or URL paths.
	•	The behavior of /api/events, /api/cost-events, or /api/metrics/*.
	•	Do:
	•	Keep imports tidy.
	•	Remove obviously dead code if you encounter it during refactor (but don’t go hunting for it beyond the dashboard scope).
	•	Add small comments only where necessary for clarity.

⸻

5. EXECUTION STEPS (AS THE AGENT INSIDE CURSOR)
	1.	Scan relevant files first
	•	app/layout.tsx
	•	app/page.tsx
	•	app/analytics/page.tsx (if present)
	•	All dashboard metric hooks (wherever they live).
	•	Any existing types file.
	2.	Design the useDashboardData shape based on real usage in the pages.
	3.	Implement/refine useDashboardData, move transforms out of pages into this hook.
	4.	Refactor app/page.tsx and app/analytics/page.tsx to consume useDashboardData.
	5.	Create/refine ClientShell, move client logic from app/layout.tsx into it, and make app/layout.tsx a server component.
	6.	Add/extend shared types for metrics/campaigns and wire them into all relevant hooks.
	7.	Run TypeScript checks (if available) and fix errors cleanly.
	8.	Sanity check:
	•	With the same date range + campaign, KPIs and charts show the same values as before.
	•	No obvious layout breakage.
	•	No new runtime errors in the console.
	9.	Summarize changes in-code or via brief comments where appropriate (e.g. at the top of useDashboardData.ts), but do not modify planning docs.

Apply these changes now, step-by-step, directly in the repo.

