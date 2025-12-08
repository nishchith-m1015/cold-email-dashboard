# UI Improvements & Functionality Plan

**Date**: December 5, 2025  
**Status**: Planning Phase  
**Scope**: UI changes, button functionality, calculations, equations

---

## Current State Overview

### Pages
| Page | Location | Status |
|------|----------|--------|
| Dashboard (Overview) | `app/page.tsx` | ✅ Built |
| Analytics | `app/analytics/page.tsx` | ✅ Built |
| Sign In / Sign Up | `app/sign-in/`, `app/sign-up/` | ✅ Built (Clerk) |

### Components (15 total)
| Component | Purpose | Status |
|-----------|---------|--------|
| `metric-card.tsx` | KPI display cards | ✅ Built |
| `time-series-chart.tsx` | Line/area charts | ✅ Built |
| `donut-chart.tsx` | Pie/donut charts | ✅ Built |
| `campaign-table.tsx` | Campaign data table | ✅ Built |
| `date-range-picker.tsx` | Date selection | ✅ Built |
| `campaign-selector.tsx` | Campaign dropdown | ✅ Built |
| `timezone-selector.tsx` | Timezone picker | ✅ Built |
| `provider-selector.tsx` | Provider filter | ✅ Built |
| `ask-ai.tsx` | AI Q&A feature | ✅ Built |
| `step-breakdown.tsx` | Email sequence stats | ✅ Built |
| `daily-sends-chart.tsx` | Daily send bar chart | ✅ Built |
| `daily-cost-chart.tsx` | Daily cost chart | ✅ Built |
| `efficiency-metrics.tsx` | Cost/reply, projections | ✅ Built |
| `sender-breakdown.tsx` | Per-sender stats | ✅ Built |
| `workspace-switcher.tsx` | Workspace selection | ❓ Status unknown |

---

## 📋 Tell Me What Needs Work

Please provide details on the following categories. For each item, tell me:
1. **What's not working** (current behavior)
2. **What it should do** (expected behavior)
3. **Priority** (High/Medium/Low)

---

## Category 1: Button Clicks / Interactions

### Questions:
- Which buttons are not functional?
- What should happen when they're clicked?
- Are there buttons that need to be added?

### Template:
```
Button: [Name/Location]
Current: [What happens now]
Expected: [What should happen]
Priority: [H/M/L]
```

### Example Issues (fill in what applies):
- [ ] Date range picker buttons
- [ ] Campaign selector dropdown
- [ ] Provider selector
- [ ] Timezone selector
- [ ] Ask AI submit button
- [ ] Table sorting buttons
- [ ] Table search/filter
- [ ] Chart click interactions
- [ ] Export/download buttons
- [ ] Refresh data buttons
- [ ] Other: _______________

---

## Category 2: Calculations / Equations

### Current Calculations in Code:

| Metric | Current Formula | Location |
|--------|-----------------|----------|
| Cost per Reply | `cost_usd / replies` | `efficiency-metrics.tsx` |
| Cost per Send | `cost_usd / sends` | `analytics/page.tsx` |
| Monthly Projection | `(totalSends / daysInRange) × 30 × costPerSend` | `page.tsx` |
| Reply Rate % | `(replies / sends) × 100` | API |
| Opt-Out Rate % | `(opt_outs / sends) × 100` | API |
| Click Rate % | `(clicks / sends) × 100` | API |
| Step Percentage | `(stepSends / totalSends) × 100` | `step-breakdown.tsx` |

### Questions:
- Which calculations are wrong?
- What's the correct formula?
- Are there new metrics to add?

### Template:
```
Metric: [Name]
Current Formula: [What it does now]
Correct Formula: [What it should be]
Location: [Where to fix]
Priority: [H/M/L]
```

---

## Category 3: UI Display Issues

### Questions:
- Numbers showing wrong?
- Charts not rendering correctly?
- Layout/spacing issues?
- Colors/styling issues?
- Loading states not working?
- Error states not showing?

### Template:
```
Component: [Name]
Issue: [What's wrong]
Expected: [What should show]
Priority: [H/M/L]
```

---

## Category 4: Missing Features

### Questions:
- What new buttons/controls are needed?
- What new calculations/metrics are needed?
- What new displays/visualizations are needed?

### Template:
```
Feature: [Name]
Description: [What it should do]
Location: [Where to add it]
Priority: [H/M/L]
```

---

## Category 5: Data/API Issues

### Questions:
- Data not loading?
- Wrong data being displayed?
- Missing data fields?
- API errors?

### Template:
```
Endpoint: [API route]
Issue: [What's wrong]
Expected: [What should happen]
Priority: [H/M/L]
```

---

## 📝 Your Input Section

**Fill in below with what you want to work on:**

### 1. Button/Interaction Issues:
```
(List them here)
```

### 2. Calculation/Equation Fixes:
```
(List them here)
```

### 3. UI Display Fixes:
```
(List them here)
```

### 4. New Features Needed:
```
(List them here)
```

### 5. Data/API Issues:
```
(List them here)
```

---

## Implementation Approach

Once you fill in the specifics, I'll create:

1. **Task List** - Prioritized list of changes
2. **File Map** - Which files need to change for each task
3. **Order of Operations** - What to implement first
4. **Estimated Effort** - How complex each change is

---

## Ready When You Are

Tell me specifically:
1. Which buttons aren't working?
2. Which calculations are wrong?
3. What new features do you need?

I'll then create a detailed implementation plan with exact code changes.
