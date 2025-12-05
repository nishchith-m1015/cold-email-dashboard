# Implementation Plan - Dashboard Fixes

**Date**: December 5, 2025  
**Source**: `prompts/New Prompt .md`  
**Status**: Planning → Implementation

---

## Task Overview

| Task | Priority | Complexity | Files Affected |
|------|----------|------------|----------------|
| Task 1: Navigation & State Desync | 🔴 High | Low | `components/layout/header.tsx` |
| Task 2: Persist Date Selection (URL) | 🔴 High | Medium | `app/page.tsx`, `app/analytics/page.tsx` |
| Task 3a: Currency Formatting | 🟡 Medium | Low | `lib/utils.ts` |
| Task 3b: Rename "Total LLM Cost" | 🟡 Medium | Low | `app/analytics/page.tsx` |
| Task 3c: Model Name Mapping | 🟡 Medium | Medium | `hooks/use-dashboard-data.ts` |
| Task 3d: Analytics Calculations | 🟡 Medium | Medium | `hooks/use-dashboard-data.ts` |
| Task 4: Performance (useMemo) | 🟢 Low | Low | `hooks/use-dashboard-data.ts` |

---

## Task 1: Fix Navigation & State Desync

### Problem
Navigation uses local `useState(activeTab)` which desyncs from URL.

### Solution
Replace local state with `usePathname()` from `next/navigation`.

### File: `components/layout/header.tsx`

**Changes Required:**
1. ❌ Remove: `const [activeTab, setActiveTab] = useState(...)`
2. ✅ Add: `import { usePathname } from 'next/navigation'`
3. ✅ Add: `const pathname = usePathname()`
4. ✅ Update: className logic to use `pathname === '/'` and `pathname === '/analytics'`
5. ❌ Remove: `onClick` handlers that set state

**Before:**
```tsx
const [activeTab, setActiveTab] = useState('overview');
// ...
<button 
  onClick={() => setActiveTab('overview')}
  className={activeTab === 'overview' ? 'active' : ''}
>
```

**After:**
```tsx
const pathname = usePathname();
// ...
<Link 
  href="/"
  className={pathname === '/' ? 'active' : ''}
>
```

---

## Task 2: Persist Date Selection (URL Params)

### Problem
Date selection resets when navigating between pages or refreshing.

### Solution
Use URL search params instead of local state.

### Files: `app/page.tsx`, `app/analytics/page.tsx`

**Changes Required:**
1. ✅ Add: `import { useSearchParams, useRouter } from 'next/navigation'`
2. ❌ Remove: `useState` for `startDate` and `endDate`
3. ✅ Add: Read dates from URL params with fallback
4. ✅ Update: `handleDateChange` to use `router.replace` with new params

**Before:**
```tsx
const [startDate, setStartDate] = useState(() => toISODate(daysAgo(30)));
const [endDate, setEndDate] = useState(() => toISODate(new Date()));

const handleDateChange = (start, end) => {
  setStartDate(start);
  setEndDate(end);
};
```

**After:**
```tsx
const searchParams = useSearchParams();
const router = useRouter();

const startDate = searchParams.get('start') ?? toISODate(daysAgo(30));
const endDate = searchParams.get('end') ?? toISODate(new Date());

const handleDateChange = useCallback((start: string, end: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('start', start);
  params.set('end', end);
  router.replace(`?${params.toString()}`, { scroll: false });
}, [searchParams, router]);
```

---

## Task 3a: Currency Formatting Fix

### Problem
Micro-costs show as $0.00 instead of actual value.

### Solution
Show 4 decimal places for values < $1.00.

### File: `lib/utils.ts`

**Changes Required:**
```tsx
export function formatCurrency(value: number): string {
  if (value < 1) {
    // Show 4 decimal places for micro-costs
    return `$${value.toFixed(4)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
```

---

## Task 3b: Rename "Total LLM Cost"

### Problem
Card says "Total LLM Cost" but should include all costs.

### Solution
Rename to "Total Cost" and ensure it sums ALL costs.

### File: `app/analytics/page.tsx`

**Change:**
```tsx
// Before
<MetricCard
  title="Total LLM Cost"
  ...
/>

// After
<MetricCard
  title="Total Cost"
  ...
/>
```

---

## Task 3c: Model Name Mapping

### Problem
Raw model names like "o3-mini-2025-01-31" are not user-friendly.

### Solution
Create display name mapping.

### File: `hooks/use-dashboard-data.ts` (or `lib/constants.ts`)

**Add:**
```tsx
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "o3-mini-2025-01-31": "o3 Mini",
  "claude-sonnet-4-5-20250929": "Sonnet 4.5",
  "linkedin_research_tool": "LinkedIn Research Tool",
  "custom_search_api": "Custom Search API",
  "chatgpt-4o-latest": "GPT 4o",
  "google-maps-reviews-scraper": "Reviews Scraper",
};

export function getModelDisplayName(rawName: string): string {
  return MODEL_DISPLAY_NAMES[rawName] ?? rawName;
}
```

**Apply in chart data transformation:**
```tsx
const costByModel = useMemo(() => {
  if (!costData?.by_model) return [];
  return costData.by_model.map(m => ({
    name: getModelDisplayName(m.model), // Apply mapping here
    value: m.cost_usd,
    color: getModelColor(m.model),
  }));
}, [costData]);
```

---

## Task 3d: Analytics Calculations

### Problem
Need accurate Cost per Reply, Cost per Send, Monthly Projection.

### Solution
Update calculation logic in hooks.

### File: `hooks/use-dashboard-data.ts`

**Calculations:**
```tsx
// Cost per Reply
const costPerReply = useMemo(() => {
  const totalCost = costData?.total.cost_usd ?? 0;
  const replies = summary?.replies ?? 0;
  return replies > 0 ? totalCost / replies : 0;
}, [costData, summary]);

// Cost per Send
const costPerSend = useMemo(() => {
  const totalCost = costData?.total.cost_usd ?? 0;
  const sends = summary?.sends ?? 0;
  return sends > 0 ? totalCost / sends : 0;
}, [costData, summary]);

// Monthly Projection
const monthlyProjection = useMemo(() => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Check if selected range is current month
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  const isCurrentMonth = 
    rangeStart >= startOfMonth && rangeEnd <= endOfMonth;
  
  if (!isCurrentMonth) {
    return null; // Will display "N/A"
  }
  
  const daysPassed = Math.ceil(
    (today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysInMonth = endOfMonth.getDate();
  const totalCost = costData?.total.cost_usd ?? 0;
  
  return daysPassed > 0 
    ? (totalCost / daysPassed) * daysInMonth 
    : 0;
}, [startDate, endDate, costData]);
```

---

## Task 4: Performance (useMemo)

### Problem
Heavy data processing may cause unnecessary re-renders.

### Solution
Wrap all transformations in `useMemo`.

### File: `hooks/use-dashboard-data.ts`

**Verify these are memoized:**
- ✅ `costByProvider` transformation
- ✅ `costByModel` transformation
- ✅ `costPerReply` calculation
- ✅ `costPerSend` calculation
- ✅ `monthlyProjection` calculation

**Verify API calls pass dates:**
- ✅ Check that `useMetricsSummary(startDate, endDate, campaign)` passes dates
- ✅ Check that `useCostBreakdown(startDate, endDate, ...)` passes dates
- ✅ Ensure backend filters at database level, not frontend

---

## Execution Order

```
Step 1: Task 1 - Navigation Fix
        └── Edit: components/layout/header.tsx
        └── Test: Click nav, verify URL matches highlight
        └── ✓ Confirm before proceeding

Step 2: Task 2 - Date Persistence  
        └── Edit: app/page.tsx
        └── Edit: app/analytics/page.tsx
        └── Test: Change date, navigate, verify persistence
        └── ✓ Confirm before proceeding

Step 3: Task 3a - Currency Format
        └── Edit: lib/utils.ts
        └── Test: Verify micro-costs display correctly
        └── ✓ Confirm before proceeding

Step 4: Task 3b - Rename Card
        └── Edit: app/analytics/page.tsx
        └── Test: Verify "Total Cost" label
        └── ✓ Confirm before proceeding

Step 5: Task 3c - Model Names
        └── Edit: lib/constants.ts (add mapping)
        └── Edit: hooks/use-dashboard-data.ts (apply mapping)
        └── Test: Verify chart labels
        └── ✓ Confirm before proceeding

Step 6: Task 3d - Calculations
        └── Edit: hooks/use-dashboard-data.ts
        └── Test: Verify calculations are correct
        └── ✓ Confirm before proceeding

Step 7: Task 4 - Performance Verification
        └── Review: hooks/use-dashboard-data.ts
        └── Verify: All heavy operations memoized
        └── ✓ Done
```

---

## Ready to Execute

Say **"Start Task 1"** and I'll implement the navigation fix first.

After each task, I'll ask you to test before moving to the next one.
