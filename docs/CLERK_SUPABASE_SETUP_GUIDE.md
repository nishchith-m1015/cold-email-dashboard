# Clerk-Supabase Integration Setup Guide

## Overview
This guide walks through setting up automated user synchronization between Clerk and Supabase using webhooks and JWT-based authentication.

---

## ⚡ Quick Summary

| Component | What to Do | Key Files |
|-----------|-----------|-----------|
| **Clerk JWT Template** | Create template named "supabase" with custom claims | Clerk Dashboard > JWT Templates |
| **Supabase JWKS** | Configure to trust Clerk's JWKS endpoint | Supabase > Authentication > JWT Settings |
| **Database Migration** | Run migration to create RLS policies | `20251209_clerk_sync_rls.sql` |
| **Webhook Setup** | Add endpoint to sync users | `/api/webhooks/clerk` |
| **Backfill** | Sync existing Clerk users | `scripts/backfill-clerk-users.ts` |

---

## Step 1: Configure Supabase JWT (10 min)

### 1.1 Create Clerk JWT Template
1. Go to https://dashboard.clerk.com
2. Navigate to **Configure** > **JWT Templates**
3. Click **New Template** > **Supabase**
4. Name it: `supabase`
5. In the template editor:
   - **Token lifetime:** Keep at 60 seconds (default)
   - **Allowed clock skew:** Keep at 5 seconds (default)
   - **Issuer:** Already filled with `https://vocal-adder-96.clerk.accounts.dev` (or your domain)
   - **JWKS Endpoint:** Already filled with `.well-known/jwks.json`
   - **Custom signing key:** ⚠️ **TOGGLE THIS OFF** (disable it)
     - This means Clerk uses its default private key (what we want)
     - If you toggle it ON, you'll need to provide a signing key (not needed)

6. Scroll down to **Customize session token** section
7. Click on **Claims** to add custom claims
8. Add these claims:
   ```json
   {
     "aud": "authenticated",
     "role": "authenticated"
   }
   ```
9. Click **Save**
10. Copy the **JWKS Endpoint** URL: `https://vocal-adder-96.clerk.accounts.dev/.well-known/jwks.json`

### 1.2 Configure Supabase to Accept Clerk JWT

**Method 1: Using Supabase's Clerk Third-Party Auth (Recommended)**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Click on the **Third-Party Auth** tab
5. Click **"Add provider"** and select **`Clerk`** from the dropdown
6. You should be redirected to a configuration page or see a modal.
   - **Name:** `Clerk`
   - **Client ID:** (Leave empty - Supabase will verify JWT via JWKS)
   - **Client Secret:** (Leave empty)
7. Click **Save**

**Method 2: Using OpenID Connect (If Clerk Third-Party Auth is not available)**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **OpenID Connect** and click it
5. Fill in:
   - **Name:** `Clerk`
   - **Configuration URL:** `https://vocal-adder-96.clerk.accounts.dev/.well-known/openid-configuration`
   - (Replace `vocal-adder-96` with your actual Clerk domain)
6. Click **Save**

**Method 3: Using JWT Settings (If neither of the above options work)**

1. Go to **Authentication** > **JWT Settings**
2. Under **JWT Verification:**
   - **JWKS URL:** Paste the JWKS Endpoint from Clerk template:
     ```
     https://vocal-adder-96.clerk.accounts.dev/.well-known/jwks.json
     ```
   - Leave JWT Secret empty (Clerk handles verification via JWKS)
3. Click **Save**

### 1.3 Test JWT Verification
Run this query in Supabase SQL Editor:
```sql
-- This tests that the auth.clerk_user_id() function works
SELECT auth.clerk_user_id();
-- Should return NULL (you're using service role, not a Clerk JWT)
```

**To test with a real JWT:**
1. Sign in to your dashboard with your Clerk account
2. In your browser console:
   ```javascript
   const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
   console.log(token); // Should print a long JWT string
   ```
3. Copy that JWT and test it in Supabase by setting `app.user_id` in SQL:
   ```sql
   SELECT set_config('app.user_id', 'user_xxx', false);
   SELECT auth.clerk_user_id(); -- Should return 'user_xxx'
   ```

   https://tracee-tabernacular-brandee.ngrok-free.dev/api/webhooks/clerk

### 1.4 Visual: How It All Connects

```
CLERK (Authentication)
├─ JWT Template: "supabase"
├─ JWKS Endpoint: .well-known/jwks.json
└─ Custom Claims: { "aud": "authenticated", "role": "authenticated" }
         ↓
         ↓ (User signs in, app requests JWT)
         ↓
YOUR APP (Next.js)
├─ getToken({ template: 'supabase' }) → Gets JWT from Clerk
├─ Pass JWT in Authorization header
└─ Send to Supabase
         ↓
         ↓ (API request with JWT)
         ↓
SUPABASE (Database)
├─ Verifies JWT using Clerk's JWKS Endpoint
├─ Extracts user ID from JWT "sub" claim
├─ Checks RLS policies
└─ Returns only authorized rows
```

### 1.5 The Client-Side Part (Already In Your Code)

You don't need to add anything! Your app already has the correct setup:

```typescript
// In your Next.js client code, when signing in:
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

export function MyComponent() {
  const { getToken } = useAuth();

  // This is what fetches your JWT from Clerk
  const token = await getToken({ template: 'supabase' });
  
  // This is what passes it to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      }
    }
  );
}
```

**The Key Flow:**
1. Clerk generates JWT when user signs in
2. Your app calls `getToken({ template: 'supabase' })` to get it
3. JWT is sent to Supabase in `Authorization` header
4. Supabase verifies JWT using Clerk's JWKS endpoint
5. RLS policies check the JWT claims (specifically the `sub` claim = user ID)

✅ **This is already working in your code!** No client wrapper needed.

---

## Step 2: Apply Database Migration (5 min)

### 2.1 Run Migration
1. Open Supabase SQL Editor
2. Copy contents of `supabase/migrations/20251209_clerk_sync_rls.sql`
3. Paste and click **Run**
4. Wait for completion (~10 seconds)

### 2.2 Verify Tables Created
```sql
-- Check users table exists
SELECT * FROM public.users LIMIT 1;

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'email_events', 'llm_usage', 'daily_stats', 'contacts')
ORDER BY tablename;
```

Expected: You should see new policies like `contacts_user_workspace_access`, `email_events_user_workspace_access`, etc.

---

## Step 3: Configure Clerk Webhook (10 min)

### 3.1 Get Webhook Secret
1. Go to Clerk Dashboard > **Configure** > **Webhooks**
2. Click **Add Endpoint**
3. Set URL:
   - **Local dev:** `https://your-ngrok-url.ngrok-free.dev/api/webhooks/clerk`
   - **Production:** `https://cold-email-dashboard.vercel.app/api/webhooks/clerk`
4. Subscribe to events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
5. Click **Create**
6. Copy the **Signing Secret** (starts with `whsec_`)

### 3.2 Add Environment Variables

**Local (.env.local):**
```env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Vercel:**
1. Go to Vercel Dashboard > Your Project > **Settings** > **Environment Variables**
2. Add:
   - Key: `CLERK_WEBHOOK_SECRET`
   - Value: `whsec_xxxxxxxxxxxxx`
   - Environments: Production, Preview, Development

### 3.3 Test with ngrok (Local Only)
```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Terminal 2: Start dev server
npm run dev

# Terminal 3: Update Clerk webhook URL to ngrok URL
# Then create a test user in Clerk and verify webhook fires
```

---

## Step 4: Run Backfill Script (5 min)

### 4.1 Set Environment Variables
Ensure these are in `.env.local`:
```env
CLERK_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for dev
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

### 4.2 Run Backfill
```bash
npx tsx scripts/backfill-clerk-users.ts
```

Expected output:
```
Fetching users from Clerk...
Found 3 users to sync
✓ Synced user_36QtXCPqQu6k0CXcYM0Sn2OQsgT
✓ Synced user_xxx
✓ Synced user_yyy
Success: 3/3 users synced to Supabase
```

### 4.3 Verify in Supabase
```sql
SELECT id, email, first_name, last_name, created_at 
FROM public.users 
ORDER BY created_at DESC;
```

You should see all your Clerk users.

---

## Step 5: Test the Integration (10 min)

### 5.1 Test Webhook Flow
1. Go to Clerk Dashboard > **User & Authentication** > **Users**
2. Click **Create User** (or use Sign-up page)
3. Check Supabase `public.users` table
4. Verify new user appears within 2 seconds

### 5.2 Test RLS with JWT
Create a simple test page:
```typescript
// app/test-rls/page.tsx
'use client';

import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

export default function TestRLS() {
  const { user } = useUser();
  const [result, setResult] = useState('');

  const testRLS = async () => {
    const response = await fetch('/api/test-rls');
    const data = await response.json();
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <div className="p-8">
      <h1>RLS Test</h1>
      <p>Logged in as: {user?.emailAddresses[0]?.emailAddress}</p>
      <button onClick={testRLS} className="bg-blue-500 px-4 py-2 rounded">
        Test RLS Query
      </button>
      <pre className="mt-4 bg-gray-100 p-4 rounded">{result}</pre>
    </div>
  );
}
```

And test API:
```typescript
// app/api/test-rls/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const { getToken, userId } = await auth();
  const token = await getToken({ template: 'supabase' });
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );
  
  const { data, error } = await supabase
    .from('email_events')
    .select('id, workspace_id, contact_email')
    .limit(5);
  
  return Response.json({ 
    userId, 
    rowCount: data?.length,
    hasError: !!error,
    message: error ? 'RLS blocked access' : 'RLS allowed access'
  });
}
```

---

## Step 6: Troubleshooting

### Issue: Webhook returns 400 "Invalid signature"
**Cause:** `CLERK_WEBHOOK_SECRET` doesn't match Clerk dashboard  
**Fix:** Copy the exact secret from Clerk > Webhooks > Your endpoint

### Issue: RLS blocks all queries
**Cause:** JWT template not configured or mismatch  
**Fix:** 
1. Verify JWT template name is `supabase` in Clerk
2. Verify you're calling `getToken({ template: 'supabase' })` in client code
3. Check Supabase logs for JWT validation errors

### Issue: Users not appearing in Supabase
**Cause:** Webhook not firing or endpoint error  
**Fix:**
1. Check Clerk Dashboard > Webhooks > Logs
2. Verify endpoint URL is correct
3. Check Vercel/ngrok logs for errors

### Issue: Backfill script fails
**Cause:** Missing Clerk API key  
**Fix:** Add `CLERK_SECRET_KEY` to `.env.local`

---

## Security Checklist

- [ ] JWT template configured in Clerk
- [ ] JWT secret configured in Supabase
- [ ] Webhook secret added to environment variables
- [ ] RLS policies tested (cannot access other workspace data)
- [ ] Webhook endpoint returns 401 for invalid signatures
- [ ] Super admin can still access all workspaces
- [ ] Service role queries bypass RLS (for background jobs)

---

## Next Steps

After completing this setup:
1. Test the `/join` page with invite codes
2. Verify workspace switching works correctly
3. Test API routes respect workspace isolation
4. Deploy to production (Vercel)
5. Update Clerk webhook URL to production endpoint

---

**Last Updated:** December 8, 2025  
**Related:** `supabase/migrations/20251209_clerk_sync_rls.sql`

