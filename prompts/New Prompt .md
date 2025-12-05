## **Master Prompt for AI Agent**

CONTEXT:  
I am working on a cold-email-dashboard (Next.js/React). I have uploaded the current codebase. I need to apply specific logic fixes, UI updates, and new analytics features based on the following requirements.  
**CRITICAL RULES:**

1. **Do not break the build.**  
2. **Do not touch n8n workflows** (data ingestion is already working).  
3. **Surgical changes only:** Modify specific files as requested below.

### ---

**Task 1: Fix Navigation & State Desync (Priority High)**

**Target File:** components/layout/header.tsx (or Sidebar.tsx if applicable)

The current navigation uses local state (activeTab) which desyncs from the URL.

1. **Remove:** Delete const \[activeTab, setActiveTab\] \= useState(...).  
2. **Refactor:** Import usePathname from next/navigation.  
3. **Logic:** Update the "Overview" and "Analytics" links/buttons.  
   * Remove onClick handlers that set state.  
   * Set className based on pathname \=== '/' or pathname \=== '/analytics'.  
4. **Goal:** The highlight must always match the actual browser URL.

### ---

**Task 2: Persist Date Selection (URL Params)**

**Target Files:** app/page.tsx, app/analytics/page.tsx

The date selection currently resets on navigation.

1. **Lift State:** Instead of useState for startDate/endDate, use useSearchParams to read ?start=...\&end=... from the URL.  
2. **Defaults:** If params are missing, fallback to daysAgo(30) and today.  
3. **Update Handler:** Change handleDateChange to use router.replace (shallow routing) to update the URL query params. This ensures the date persists when switching pages or refreshing.

### ---

**Task 3: UI & Data Logic Updates**

**1\. Renaming & Precision**

* **Target:** lib/utils.ts  
  * Update formatCurrency to handle micro-costs. If a value is \< $1.00, display **4 decimal places** (e.g., $0.0042).  
* **Target:** app/analytics/page.tsx  
  * Change the card title "Total LLM Cost" to **"Total Cost"**. This metric must sum **ALL** costs (LLM \+ Paid Services like Apify/Relevance) for the selected date range.

**2\. Model Name Mapping**

* **Target:** hooks/use-dashboard-data.ts (or where charts are prepared).  
* Create and apply this exact mapping object for the charts:  
  JavaScript  
  const MODEL\_DISPLAY\_NAMES \= {  
    "o3-mini-2025-01-31": "o3 Mini",  
    "claude-sonnet-4-5-20250929": "Sonnet 4.5",  
    "linkedin\_research\_tool": "LinkedIn Research Tool",  
    "custom\_search\_api": "Custom Search API",  
    "chatgpt-4o-latest": "GPT 4o",  
    "google-maps-reviews-scraper": "Reviews Scraper"  
  };

**3\. New Analytics Calculations**

* **Target:** hooks/use-dashboard-data.ts  
* **Cost per Reply:** Calculate as Total Cost / Total Replies (handle division by zero).  
* **Cost per Send:** Calculate as Total Cost / Total Sends.  
* **Monthly Projection:**  
  * Logic: (Total Cost So Far / Days Passed in Month) \* Total Days in Current Month.  
  * If the selected range is NOT the current month, hide this or show "N/A".

### ---

**Task 4: Performance & Database**

* **Target:** hooks/use-dashboard-data.ts  
* Ensure all heavy data processing (like mapping the MODEL\_DISPLAY\_NAMES or summing costs) is wrapped in useMemo.  
* **Verify:** Ensure API calls pass the startDate and endDate to the backend so we filter at the database level (Postgres), not the frontend.

### ---

**Execution Plan**

Start with **Task 1 (Navigation)**, then **Task 2 (Date State)**, then apply the **UI/Logic changes**. Confirm each step before moving to the next.