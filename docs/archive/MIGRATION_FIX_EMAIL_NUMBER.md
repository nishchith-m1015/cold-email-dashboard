# 🚨 CRITICAL FIX: Missing email_number Column

## Problem Discovered

Your production database is **missing the `email_number` column** that exists in `schema.sql`. This causes:
- ❌ Sequence Breakdown showing zero
- ❌ Materialized view can't calculate email_1_sends/email_2_sends/email_3_sends properly
- ❌ "Contacts Reached" metric is inaccurate

## Solution: Run These 2 Migrations in Order

### Step 1: Add email_number Column & Backfill Data
**File:** `supabase/migrations/20251207000003_add_email_number_column.sql`

```sql
-- This migration:
-- 1. Adds the email_number INTEGER column
-- 2. Backfills data from metadata->>'email_number'
-- 3. Adds performance indexes
-- 4. Reports how many rows were backfilled
```

**How to Run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `20251207000003_add_email_number_column.sql`
3. Paste and click **RUN**
4. Check the output - should say "Added email_number column" and show backfilled count

### Step 2: Update Materialized View to Use New Column
**File:** `supabase/migrations/20251207000004_fix_materialized_view_columns.sql`

```sql
-- This migration:
-- 1. Recreates mv_daily_stats using email_number column
-- 2. Falls back to metadata for backwards compatibility
-- 3. Refreshes the view with correct data
```

**How to Run:**
1. In Supabase SQL Editor
2. Copy contents of `20251207000004_fix_materialized_view_columns.sql`
3. Paste and click **RUN**
4. Should complete in 5-10 seconds

### Step 3: Verify It Worked

Run this query:
```sql
-- Should show non-zero counts
SELECT 
  campaign_name,
  SUM(email_1_sends) as total_email_1,
  SUM(email_2_sends) as total_email_2,
  SUM(email_3_sends) as total_email_3
FROM mv_daily_stats
GROUP BY campaign_name;
```

**Expected Result:**
```
campaign_name | total_email_1 | total_email_2 | total_email_3
--------------+---------------+---------------+--------------
Ohio          |           150 |            75 |            30
```

If you see zeros, it means the metadata field is also empty. Let me know and we'll need to check your n8n workflow.

## After Migration: Deploy Updated API

Once the database is fixed, deploy the updated API code:

```bash
npm run build
vercel --prod
```

The API now uses `totals.email_1_sends` from the materialized view (fast and accurate).

## Why This Happened

Your `schema.sql` defines `email_number INTEGER`, but the actual production database was created before this column was added. The original migration files didn't include it, so it was never created.

## Files Modified

- ✅ Created: `supabase/migrations/20251207000003_add_email_number_column.sql`
- ✅ Created: `supabase/migrations/20251207000004_fix_materialized_view_columns.sql`
- ✅ Updated: `app/api/dashboard/aggregate/route.ts` (already deployed, uses materialized view)

## Next Steps

1. Run migration 20251207000003 (add column)
2. Run migration 20251207000004 (fix view)
3. Verify with test query
4. Report back the results
5. Deploy API to production

Let me know what the backfill count shows!
