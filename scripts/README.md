# Scripts Directory

This directory contains maintenance and setup scripts for the Cold Email Dashboard.

## Available Scripts

### `test-click-tracking.sh` ⭐

Tests the click tracking implementation by sending requests to the `/api/track/click` endpoint.

**When to use:**
- After implementing click tracking (Phase 28)
- To verify click tracking is working correctly
- Before deploying to production

**Prerequisites:**
- Dashboard must be deployed (Vercel or localhost)
- `curl` and `jq` installed (for URL encoding)

**Usage:**
```bash
chmod +x scripts/test-click-tracking.sh
./scripts/test-click-tracking.sh
```

**Optional: Test database logging**
```bash
export DATABASE_URL='postgresql://user:pass@host:5432/dbname'
./scripts/test-click-tracking.sh
```

**What it tests:**
1. ✅ Endpoint responds (HTTP 200/302)
2. ✅ Redirects to correct destination
3. ✅ Rejects requests without workspace_id
4. ⚠️ Database logging (optional, requires psql)

**Expected output:**
```
🔍 Testing Click Tracking Implementation
========================================

📝 Test Configuration:
  Dashboard URL: https://cold-email-dashboard.vercel.app
  Test Email: test@example.com
  Campaign: Ohio
  Step: 1
  Link ID: test_link
  Workspace ID: default
  Destination: https://example.com

🔗 Generated Tracking URL:
  https://cold-email-dashboard.vercel.app/api/track/click?url=...

🧪 Test 1: Endpoint Response
----------------------------
✅ PASS: Endpoint returned HTTP 302 (redirect working)

🧪 Test 2: Redirect Verification
--------------------------------
✅ PASS: Redirects to correct destination: https://example.com

🧪 Test 3: Missing workspace_id (Should Fail)
-------------------------------------------
✅ PASS: Correctly rejects request without workspace_id (HTTP 400)

🧪 Test 4: Database Logging (Optional)
------------------------------------
⏭️  SKIP: psql not available or DATABASE_URL not set

========================================
✅ Click Tracking Tests Complete!
```

---

### `backfill-clerk-users.ts`

Syncs existing Clerk users to the Supabase `public.users` table.

**When to use:**
- After initial Clerk-Supabase integration setup
- After the webhook endpoint is created but before it has processed any events
- To recover from sync failures

**Prerequisites:**
- Supabase migration `20251209_clerk_sync_rls.sql` must be applied
- Environment variables must be set:
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Usage:**
```bash
npx tsx scripts/backfill-clerk-users.ts
```

**What it does:**
1. Fetches all users from Clerk API (paginated)
2. Upserts each user to Supabase `public.users` table
3. Reports success/failure for each user
4. Verifies total count in Supabase

**Expected output:**
```
🔄 Starting Clerk user backfill...

📥 Fetching users from Clerk...
✓ Found 3 users in Clerk

📤 Syncing users to Supabase...
  ✓ John Doe (user_xxx)
  ✓ Jane Smith (user_yyy)
  ✓ Admin User (user_zzz)

==================================================
📊 Backfill Summary:
   Total users: 3
   ✓ Synced: 3
==================================================

🔍 Verifying users in Supabase...
✓ Total users in Supabase: 3

✅ Backfill complete!
```

---

## Development Notes

- Scripts use `tsx` for TypeScript execution (no build step needed)
- All scripts use the service role key to bypass RLS
- Scripts are idempotent (safe to run multiple times)
- Failed operations are logged but don't stop execution

---

## Adding New Scripts

When creating new scripts:
1. Add TypeScript shebang: `#!/usr/bin/env node`
2. Use clear console output with emojis for status
3. Validate environment variables at the start
4. Handle errors gracefully
5. Provide a summary at the end
6. Update this README
