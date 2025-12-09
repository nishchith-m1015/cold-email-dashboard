# Clerk-Supabase Integration Troubleshooting

## Quick Reference

### Q: I can't find "Custom JWT Provider" in Supabase
**A:** Supabase removed that feature. Use **JWT Settings** or **OpenID Connect** instead.

**Where to find it:**
1. Supabase Dashboard > Your Project
2. Go to **Authentication** (left sidebar)
3. Click **Providers**
4. Look for **JWT (Next Auth)** or skip to JWT Settings

---

### Q: Do I need to add a client wrapper?
**A:** No! Your app already has it. Check your code for this pattern:

```typescript
// This is the correct pattern (already in your code)
const token = await getToken({ template: 'supabase' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: { headers: { Authorization: `Bearer ${token}` } }
  }
);
```

If you see this, you're good to go! ✅

---

### Q: How do I test if JWT verification is working?
**A:** Sign in, then run this in your browser console:

```javascript
// Get current JWT from Clerk
const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
console.log('JWT:', token); // Should see a long string like "eyJxxx..."

// Check JWT claims
const parts = token.split('.');
const claims = JSON.parse(atob(parts[1]));
console.log('Claims:', claims); // Should have "sub" = your Clerk user ID
```

---

### Q: RLS policies blocking all queries
**A:** Check that:

1. **JWT is being sent correctly**
   ```typescript
   // Your Supabase client must pass JWT in header
   const token = await getToken({ template: 'supabase' });
   // token must be non-null and non-empty
   ```

2. **User exists in `public.users` table**
   ```sql
   SELECT * FROM public.users WHERE id = 'user_xxx';
   -- Must return 1 row
   ```

3. **User has workspace access**
   ```sql
   SELECT * FROM user_workspaces WHERE user_id = 'user_xxx';
   -- Must return at least 1 row
   ```

4. **JWT claims are correct**
   - The JWT `sub` claim must match the Clerk user ID
   - The JWT `aud` claim should be "authenticated"

---

### Q: Webhook isn't firing / users not syncing
**A:** Check:

1. **Webhook endpoint is reachable**
   ```bash
   # Test locally with ngrok
   ngrok http 3000
   # Update Clerk webhook to: https://your-ngrok-url.ngrok-free.dev/api/webhooks/clerk
   ```

2. **CLERK_WEBHOOK_SECRET is set correctly**
   ```bash
   echo $CLERK_WEBHOOK_SECRET
   # Should print: whsec_xxx...
   ```

3. **Check Clerk webhook logs**
   - Clerk Dashboard > Configure > Webhooks > Your Endpoint > Logs
   - Look for red "Failed" entries
   - Click to see error message

4. **Check application logs**
   - Vercel: Deployment > Logs
   - Local: `npm run dev` console output

---

### Q: "User doesn't exist in public.users" error
**A:** Run the backfill script:

```bash
export CLERK_SECRET_KEY=sk_live_xxx  # Or sk_test_xxx for dev
export NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJxxx

npx tsx scripts/backfill-clerk-users.ts
```

This fetches all Clerk users and inserts them to Supabase.

---

### Q: 403 Forbidden error when accessing API
**A:** The user doesn't have access to that workspace. Check:

1. **User is in user_workspaces table**
   ```sql
   SELECT * FROM user_workspaces WHERE user_id = 'user_xxx';
   -- Must return at least 1 row
   ```

2. **Workspace_id matches**
   ```sql
   -- If accessing workspace "default"
   SELECT * FROM user_workspaces 
   WHERE user_id = 'user_xxx' AND workspace_id = 'default';
   -- Must return 1 row
   ```

3. **User joined via /join page**
   - Sign in → `/join` page should appear
   - Enter valid invite code or create workspace
   - This adds user to `user_workspaces` table

---

### Q: "Invalid signature" on webhook endpoint
**A:**

1. **Check CLERK_WEBHOOK_SECRET matches exactly**
   - Copy from Clerk Dashboard > Webhooks > Your Endpoint
   - Paste into `.env.local` exactly as shown

2. **Restart dev server after changing .env.local**
   ```bash
   # Kill: Ctrl+C
   npm run dev
   ```

3. **Check ngrok URL hasn't changed**
   - ngrok URLs change every 2 hours with free plan
   - Update Clerk webhook URL if it changed

---

## Setup Checklist

- [ ] Created Clerk JWT template named "supabase"
- [ ] Clerk template has custom claims: `{ "aud": "authenticated", "role": "authenticated" }`
- [ ] Supabase JWT Settings configured (or OpenID Connect)
- [ ] Database migration applied: `20251209_clerk_sync_rls.sql`
- [ ] Webhook endpoint added: `/api/webhooks/clerk`
- [ ] `CLERK_WEBHOOK_SECRET` in `.env.local`
- [ ] `CLERK_WEBHOOK_SECRET` in Vercel environment variables
- [ ] Backfill script ran successfully: `npx tsx scripts/backfill-clerk-users.ts`
- [ ] Test user created in Clerk appears in `public.users`
- [ ] API route returns 403 for unauthorized workspace
- [ ] Signed-in user can access authorized workspace

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid signature" | Wrong CLERK_WEBHOOK_SECRET | Copy exact secret from Clerk Dashboard |
| "User doesn't exist" | Webhook didn't fire or failed | Run backfill script |
| "RLS policy blocks all queries" | JWT not sent or invalid | Check `getToken()` call |
| "403 Forbidden" | User not in workspace | Use `/join` page to assign user |
| "Cannot find workspace_id" | Missing query parameter | Add `?workspace_id=xxx` to request |
| "Workspace not found" | Invalid workspace ID | Check `workspaces` table |

---

## Debug Mode

Enable detailed logging:

```typescript
// In your API route
console.log('userId:', userId);
console.log('workspaceId:', workspaceId);
console.log('hasAccess:', { hasAccess, role });

// In your Supabase query
-- Add this to see actual RLS restriction
EXPLAIN ANALYZE
SELECT * FROM email_events 
WHERE workspace_id IN (
  SELECT uw.workspace_id 
  FROM user_workspaces uw 
  WHERE uw.user_id = auth.clerk_user_id()
);
```

---

## Still Having Issues?

1. **Check logs first:** Vercel, Clerk Dashboard, Supabase
2. **Verify checklist:** All items above must be ✅
3. **Test webhook locally:** Use ngrok + local dev server
4. **Check Supabase SQL:** Test RLS policies manually
5. **Contact support:** Clerk Dashboard has support chat

---

**Last Updated:** December 8, 2025

