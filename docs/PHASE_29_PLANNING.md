ACT AS: **Senior Frontend Systems Architect**.

**MISSION: EXECUTE PHASE 29 (UNIFIED DATE LOGIC)**
We need to standardize the Date Filtering UX across the entire application. Currently, the **Overview** and **Analytics** pages have a powerful `DateRangePicker` and `useDashboardData` hook.
The **Contacts** and **Sequences** pages are missing this.

**OBJECTIVE:**
Port the existing "Calendar/Date Range" architecture to the **Contacts** and **Sequences** pages so they function exactly like the Dashboard.

**🔎 REFERENCE ARCHITECTURE (SOURCE OF TRUTH):**
Please analyze these files first to understand the pattern we must replicate:
1.  `components/dashboard/date-range-picker.tsx` (The UI Component)
2.  `hooks/use-dashboard-data.ts` (The State Logic)
3.  `lib/dashboard-context.tsx` (The Global Context)
4.  `app/page.tsx` (How it's currently implemented in Overview)

**🛠️ EXECUTION TASKS:**

**1. Context & State Propagation**
   - Determine if `Contacts` and `Sequences` should share the global `DashboardContext` (so changing dates on the Dashboard updates Contacts too) OR if they need isolated local state.
   - *Recommendation:* If feasible, wrap them in a similar provider or reuse the global context for a seamless "Time Travel" experience across the app.

**2. UI Implementation (The Components)**
   - In `app/contacts/page.tsx` and `app/sequences/page.tsx`:
   - Inject the `<DateRangePicker />` component into the Header area (next to the "Add" buttons).
   - Ensure it matches the styling and layout of `app/analytics/page.tsx`.

**3. Backend Connection (The Wiring)**
   - Update `app/api/contacts/route.ts` and `app/api/sequences/route.ts` to accept `?startDate=X&endDate=Y` query parameters.
   - Modify the Supabase queries to filter records based on this range:
     - For **Contacts**: Filter by `created_at` (or `last_contacted_at` if available).
     - For **Sequences**: Filter by `created_at`.

**🚨 ANTIGRAVITY PROTOCOL:**
1.  **READ** the reference files first.
2.  **CREATE AN ARTIFACT:** Generate a **"Migration Plan.md"** artifact outlining exactly which files you will touch and the specific lines you will change.
3.  **WAIT** for my approval on the Artifact before writing code.

**Start by analyzing the Date Picker component.**