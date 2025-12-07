**PERFORMANCE OPTIMIZATION REQUEST**

**Context:**
The dashboard functionality is complete, but performance is unacceptable on localhost.
1.  **Slow Reloads:** Reloading the page takes ~10 seconds.
2.  **Data Gaps:** Sometimes charts or KPI cards show blank/empty data even after loading.
3.  **Goal:** The dashboard must be "snappy," load instantly on refresh, and never show broken/blank states.

**Analyze & Fix the Following Areas:**

### **1. Fix "Blank Data" (Race Conditions)**
* **Target:** `hooks/use-dashboard-data.ts` and `app/page.tsx`
* **Hypothesis:** We might be fetching data *before* the `workspace_id` or `user_id` is ready, causing 400 errors or empty returns.
* **Action:**
    * Ensure all `useSWR` or `fetch` calls are paused (`isLoading` check) until authentication and workspace context are fully loaded.
    * Implement **Keep Previous Data** behavior so the UI doesn't flash white/blank while refetching on date changes.

### **2. Optimize "10s Reload" (Server-Side Performance)**
* **Target:** `app/api/metrics/*` and `lib/db-queries.ts`
* **Hypothesis:** The backend is calculating aggregations by scanning entire tables on every refresh, and the browser is throttled by too many simultaneous API requests.
* **Action A (Indexing):** Check `schema.sql`: Add composite indexes on `(workspace_id, campaign_id, created_at)` for `email_events` and `leads` tables.
* **Action B (API Batching):** Create a single aggregate API endpoint (`/api/dashboard/all`) that fetches Summary, Timeseries, and Campaigns in parallel on the server, returning one JSON response. Refactor the hook to use this single call.

### **3. Dev Server Speed & Middleware**
* **Target:** `next.config.js` and `middleware.ts`
* **Action:**
    * Check if `turbo` (Turbopack) can be enabled.
    * Audit `middleware.ts` matchers to ensure we are NOT running auth logic on static files, images, or assets, which slows down page loads significantly.

**Deliverables:**
1.  Refactor `hooks/use-dashboard-data.ts` to use a single "Aggregate" API endpoint (reduce HTTP requests).
2.  Create/Update a SQL migration file for performance indexes.
3.  Update `middleware.ts` to exclude non-essential paths.