# Self-Healing User Sync

## Overview

This feature automatically prevents "Orphaned User" issues by syncing users from Clerk to Supabase on every page load.

## How It Works

### 1. **UserSyncProvider** (`components/providers/user-sync-provider.tsx`)

- Client-side React component that wraps authenticated pages
- Runs once per session when a user loads any page
- Calls the `/api/user/sync` endpoint

### 2. **Sync API** (`app/api/user/sync/route.ts`)

- Checks if the current user exists in the `users` table
- If missing, fetches their data from Clerk and inserts it
- Returns sync status

### 3. **Integration** (`components/layout/layout-wrapper.tsx`)

- The provider wraps all authenticated pages (non-auth routes)
- Runs automatically - no manual intervention needed

## Why This Matters

**Problem:**
When Clerk webhooks fail (e.g., ngrok tunnel closed, network issues), user creation events don't reach your database. This causes:

- "Orphaned User" displays (user exists in Clerk but not in DB)
- Broken member lists
- Permission errors

**Solution:**
This self-healing mechanism acts as a **safety net**:

- Even if webhooks fail, users get synced on their first page load
- No manual database fixes needed
- Seamless user experience

## Performance

- **Lightweight:** Only runs once per session (uses `useRef` to prevent re-runs)
- **Fast:** Single DB query to check existence, insert only if needed
- **Non-blocking:** Runs asynchronously, doesn't delay page rendering

## Monitoring

Check your server logs for sync events:

```
[UserSync] User user_123... missing from database. Syncing...
[UserSync] ✓ User user_123... synced successfully (email@example.com)
```

## Best Practices

1. **Still fix your webhooks!** This is a safety net, not a replacement for proper webhook configuration.
2. **Monitor logs:** If you see frequent sync events, your webhooks are broken.
3. **Production:** Ensure Clerk webhook points to your Vercel URL, not ngrok.

## Related Files

- `components/providers/user-sync-provider.tsx` - Client provider
- `app/api/user/sync/route.ts` - Sync API endpoint
- `components/layout/layout-wrapper.tsx` - Integration point
- `app/api/webhooks/clerk/route.ts` - Primary sync mechanism (webhooks)
