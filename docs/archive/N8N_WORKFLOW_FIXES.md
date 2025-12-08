# n8n Workflow Fixes Guide

This document contains all code snippets and instructions to fix the Email Preparation v2 and Research Report v2 workflows.

---

## Table of Contents

1. [Fix 1: Robust Google Maps Query Builder](#fix-1-robust-google-maps-query-builder)
2. [Fix 2: Apify Synchronous Endpoint](#fix-2-apify-synchronous-endpoint)
3. [Fix 3: Parallel Execution Architecture](#fix-3-parallel-execution-architecture)

---

## Fix 1: Robust Google Maps Query Builder

### Problem

The current "Build Google Maps Query" node fails silently when company/city/state fields are missing from the LinkedIn scrape data. This causes the workflow to route to "No Reviews" even when reviews exist.

### Affected Workflows

- **Email Preparation v2**: Node named "Build Google Maps Query"
- **Research Report v2**: Node named "Google Reviews1"

### Solution

Replace the existing Code Node JavaScript with this robust version that implements a 5-level fallback strategy:

```javascript
// ============================================
// ROBUST GOOGLE MAPS QUERY BUILDER
// Multi-level fallback to ALWAYS produce a valid query
// ============================================

return items.map(item => {
  // Get LinkedIn profile data - try multiple access paths
  const linkedInData = 
    $('Scrape Profiles + Posts - Relevance AI1').last()?.json?.linkedin_profile_details_data ||
    $('Scrape Profiles + Posts - Relevance AI1').last()?.json?.output?.linkedin_profile_details_data ||
    item.json?.linkedin_profile_details_data ||
    {};

  // Also check original lead data from the sheet/database
  const leadData = item.json || {};

  // Extract all possible location/company fields
  const company = String(
    leadData.company || 
    leadData.organization_name || 
    linkedInData.company || 
    ''
  ).trim();

  const city = String(
    leadData.city || 
    leadData.organization_city || 
    linkedInData.city || 
    ''
  ).trim();

  const state = String(
    leadData.state || 
    leadData.organization_state || 
    leadData.company_state || 
    linkedInData.company_state ||
    linkedInData.state ||
    ''
  ).trim();

  const country = String(
    leadData.country || 
    leadData.organization_country || 
    linkedInData.country || 
    'United States'
  ).trim();

  // Extract domain from website URL
  const websiteRaw = String(
    leadData.organization_website || 
    linkedInData.company_website || 
    linkedInData.company_domain ||
    ''
  ).trim();
  
  const domain = websiteRaw
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim();

  // Build query using fallback strategy
  let gmaps_query = '';
  let queryStrategy = '';

  // Strategy 1: Company + City + State (most precise)
  if (company && city && state) {
    gmaps_query = `${company} ${city} ${state}`;
    queryStrategy = 'company_city_state';
  }
  // Strategy 2: Company + State only
  else if (company && state) {
    gmaps_query = `${company} ${state}`;
    queryStrategy = 'company_state';
  }
  // Strategy 3: Company + City only
  else if (company && city) {
    gmaps_query = `${company} ${city}`;
    queryStrategy = 'company_city';
  }
  // Strategy 4: Company + Country
  else if (company && country) {
    gmaps_query = `${company} ${country}`;
    queryStrategy = 'company_country';
  }
  // Strategy 5: Company name only
  else if (company) {
    gmaps_query = company;
    queryStrategy = 'company_only';
  }
  // Strategy 6: Domain name (last resort)
  else if (domain) {
    // Convert domain to company-like name: "acme.com" -> "acme"
    const domainName = domain.split('.')[0];
    gmaps_query = domainName;
    queryStrategy = 'domain_fallback';
  }
  // Strategy 7: If all else fails, use a placeholder that won't crash
  else {
    gmaps_query = '';
    queryStrategy = 'no_data_available';
  }

  // Log for debugging (visible in n8n execution log)
  console.log(`[Query Builder] Strategy: ${queryStrategy}, Query: "${gmaps_query}"`);

  return {
    json: {
      ...item.json,
      gmaps_query,
      query_strategy: queryStrategy,
      company_name: company,
      // Preserve timezone fields if they exist
      'Time Zone': item.json['Time Zone'] ?? 'T1',
      Timezone: item.json.Timezone ?? 'America/Los_Angeles',
    },
  };
});
```

### How to Apply

1. Open your workflow in n8n
2. Find the "Build Google Maps Query" node (Email Prep) or "Google Reviews1" node (Research Report)
3. Click on the node to open settings
4. Replace ALL the JavaScript code with the code above
5. Save the node
6. Test with a lead that previously failed

### Verification

After applying, run a test execution and check:
- The `query_strategy` field in the output shows which fallback was used
- The `gmaps_query` field is not empty (unless truly no data available)
- The workflow routes to "Google Reviews" instead of "No Reviews"

---

## Fix 2: Apify Synchronous Endpoint

### Problem

The Research Report workflow uses the asynchronous Apify endpoint which returns run metadata instead of actual review data, causing empty reports.

### Affected Workflow

- **Research Report v2**: Node named "Google Reviews (1-3)1"

### Current (Broken) URL

```
https://api.apify.com/v2/acts/drobnikj~crawler-google-places/runs?token=YOUR_TOKEN&waitForFinish=180
```

### Fixed URL

Replace with:

```
https://api.apify.com/v2/acts/compass~google-maps-reviews-scraper/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN

```

### Updated Request Body

Also update the JSON body to match the new scraper's expected format:

```json
{
  "search": "={{ $json.gmaps_query || '' }}",
  "maxCrawledPlacesPerSearch": 1,
  "includeReviews": true,
  "reviewsMaxCount": 50,
  "reviewsSort": "newest"
}
```

### How to Apply

1. Open Research Report v2 in n8n
2. Find the "Google Reviews (1-3)1" HTTP Request node
3. Change the URL to the synchronous endpoint above
4. Update the JSON body as shown
5. Ensure the HTTP method is POST
6. Save and test

### Why This Works

| Endpoint | Behavior |
|----------|----------|
| `/runs?waitForFinish=N` | Starts a run, waits N seconds, returns **run status** |
| `/run-sync-get-dataset-items` | Starts a run, waits for completion, returns **actual data** |

The Email Preparation workflow already uses the correct synchronous endpoint.

---

## Fix 3: Parallel Execution Architecture

### Overview

Both workflows currently run linearly:

```
LinkedIn Scrape → Google CSE → Summarize → Google Reviews → Analyze → Generate
```

But Google CSE and Google Reviews are **independent** - they both need LinkedIn data but don't need each other's outputs. Running them in parallel can cut execution time by 30-50%.

---

### Email Preparation v2 - Parallel Architecture

#### Current Flow (Linear)

```
┌─────────────────┐
│ Scrape LinkedIn │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Google CSE      │ ← ~3-5 seconds
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Summarize       │ ← ~5-10 seconds
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Maps Query│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Google Reviews  │ ← ~10-30 seconds
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analyze         │
└─────────────────┘
```

#### Optimized Flow (Parallel)

```
┌─────────────────┐
│ Scrape LinkedIn │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────────────┐
│ CSE   │  │ Build Maps    │
│ Search│  │ Query         │
└───┬───┘  └───────┬───────┘
    │              │
    ▼              ▼
┌───────┐  ┌───────────────┐
│Summar-│  │ Google        │
│ize    │  │ Reviews       │
└───┬───┘  └───────┬───────┘
    │              │
    └──────┬───────┘
           │
           ▼
    ┌─────────────┐
    │    MERGE    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Analyze   │
    └─────────────┘
```

#### Step-by-Step Implementation

**Step 1: Identify the split point**

After the "💰 Track Relevance AI" node, we need to split into two branches.

**Step 2: Add connections for Branch A (CSE)**

Current connection (keep this):
```
💰 Track Relevance AI → Google CSE Search
```

**Step 3: Add NEW connection for Branch B (Reviews)**

Add a NEW output connection from "💰 Track Relevance AI" to "Build Google Maps Query":
```
💰 Track Relevance AI → Build Google Maps Query (NEW CONNECTION)
```

In n8n:
1. Click on "💰 Track Relevance AI" node
2. Drag from its output connector
3. Connect to "Build Google Maps Query"

**Step 4: Add a Merge Node**

1. Add a new "Merge" node (search "Merge" in n8n nodes)
2. Set Mode to: **Combine** → **Merge By Position**
3. Position it after both branches complete

**Step 5: Rewire the branches to Merge**

- Connect "Shape CSE → OpenAI" output → Merge Input 1
- Connect "Reviews" output → Merge Input 2

**Step 6: Connect Merge to Analyze**

- Merge output → Analyze1

**Step 7: Update the Analyze node**

The Analyze node needs to access data from BOTH branches. Update its references:

```javascript
// In the Analyze1 node's JSON body, change references from:
$json.choices[0].message.content
// to:
$('Summarize (O3-mini)').last().json?.choices?.[0]?.message?.content || ''

// And for reviews:
$('Reviews').last().json?.google_reviews_summary || 'None found'
```

---

### Research Report v2 - Parallel Architecture

#### Current Flow (Linear)

```
Scrape LinkedIn → CSE Search → Summarize → Build Query → Reviews → Analysis Chain → Report
```

#### Optimized Flow (Parallel)

```
┌─────────────────┐
│ Scrape LinkedIn │
└────────┬────────┘
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
┌───────────┐   ┌───────────┐
│ CSE       │   │ Build     │
│ Search    │   │ Maps Query│
└─────┬─────┘   └─────┬─────┘
      │               │
      ▼               ▼
┌───────────┐   ┌───────────┐
│ Summarize │   │ Google    │
│ (O3-mini) │   │ Reviews   │
└─────┬─────┘   └─────┬─────┘
      │               │
      └───────┬───────┘
              │
              ▼
       ┌─────────────┐
       │    MERGE    │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │ Citations   │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │Person+Co    │
       │Profile      │
       └─────────────┘
```

#### Step-by-Step Implementation

**Step 1: Add parallel connection**

After "💰 Track Relevance AI - Research", add a NEW connection to "Google Reviews1" (the query builder node).

**Step 2: Add Merge node**

Position it to receive:
- Input 1: From "Set (CSE → OpenAI shape)1" 
- Input 2: From "Reviews1"

**Step 3: Update downstream nodes**

The "Person + Company Profile1" node needs to access both branches. Update its references:

```javascript
// CSE Summary
$('Summarize (O3-mini)1').last().json?.choices?.[0]?.message?.content || ''

// Reviews  
$('Reviews1').last().json?.reviewsHTML || 'No reviews found'
```

---

### Important Notes

1. **n8n Merge Node Settings**:
   - Mode: **Combine**
   - Combine By: **Matching Fields** or **Position**
   - If using Position, ensure both branches output the same number of items

2. **Data Flow**:
   - Each branch still has access to the original LinkedIn data via `$()` expressions
   - The Merge node combines the outputs so downstream nodes can access both

3. **Testing**:
   - Test each branch independently first
   - Then test the merged flow
   - Check the Merge node output to verify both datasets are present

4. **Rollback**:
   - Keep your v1 workflows as backups
   - If parallelization causes issues, you can revert to linear flow

---

## Quick Reference Checklist

### Email Preparation v2

- [ ] Replace "Build Google Maps Query" code with robust version
- [ ] Add parallel connection: Track Relevance AI → Build Google Maps Query
- [ ] Add Merge node after CSE Summary and Reviews
- [ ] Rewire: Both branches → Merge → Analyze1
- [ ] Update Analyze1 to use `$()` expressions for both data sources

### Research Report v2

- [ ] Replace "Google Reviews1" code with robust version  
- [ ] Change Apify URL to synchronous endpoint
- [ ] Update Apify request body
- [ ] Add parallel connection: Track Relevance AI → Google Reviews1
- [ ] Add Merge node after CSE Summary and Reviews
- [ ] Rewire: Both branches → Merge → Citations → Analysis chain
- [ ] Update downstream nodes to use `$()` expressions

---

## Troubleshooting

### "No Reviews" still triggers

1. Check the `query_strategy` field in the node output
2. If it shows `no_data_available`, verify LinkedIn scrape returned data
3. Check console logs for the actual query being built

### Apify returns empty data

1. Verify the URL uses `run-sync-get-dataset-items`
2. Check that `gmaps_query` is not empty
3. Increase timeout if needed (some queries take 60+ seconds)

### Merge node outputs empty

1. Ensure both branches complete before Merge
2. Check that both branches output at least one item
3. Verify Merge mode matches your data structure

---

*Last updated: December 2024*

