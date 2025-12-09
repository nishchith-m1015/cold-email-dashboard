# Clerk JWT Template Setup - Visual Guide

## Step 1: Create JWT Template in Clerk

### 1.1 Navigate to JWT Templates
```
Clerk Dashboard
  → Configure (left sidebar)
    → JWT Templates
      → Click "Create Template"
        → Select "Supabase"
```

### 1.2 Name the Template
```
Name field: "supabase"
(This must match what you use in getToken({ template: 'supabase' }))
```

### 1.3 Settings to Configure

**These should already be filled in:**
- Issuer: `https://vocal-adder-96.clerk.accounts.dev`
- Token lifetime: `60` seconds
- Allowed clock skew: `5` seconds
- JWKS Endpoint: `https://vocal-adder-96.clerk.accounts.dev/.well-known/jwks.json`

**Custom signing key: TOGGLE OFF ❌**
```
⊙ Custom signing key (TOGGLE OFF)
  ❌ Don't enable this
  ✅ Leave disabled (use Clerk's default private key)
```

### 1.4 Add Custom Claims

Scroll down to **"Customize session token"** section:

```
Click on "Claims" (expand it)

In the Claims editor, add:
{
  "aud": "authenticated",
  "role": "authenticated"
}
```

This tells Supabase that this is an authenticated token.

### 1.5 Save Template

Click **"Save"** button at the bottom.

After saving, you'll see a **"JWKS Endpoint"** URL:
```
https://vocal-adder-96.clerk.accounts.dev/.well-known/jwks.json
```

**Copy this URL** - you'll need it for Supabase.

---

## Step 2: Configure Supabase to Trust Clerk

### 2.1 Go to Supabase

```
Supabase Dashboard
  → Select your project
    → Authentication (left sidebar)
      → JWT Settings
```

### 2.2 Add JWKS URL

Under **JWT Verification**, find the **JWKS URL** field:

```
JWKS URL: [Paste the Clerk JWKS endpoint]
https://vocal-adder-96.clerk.accounts.dev/.well-known/jwks.json
```

**Leave JWT Secret empty** (Clerk's JWKS will verify instead).

### 2.3 Save

Click **Save**.

---

## Step 3: Verify It's Working

### In Supabase SQL Editor:

```sql
-- Test 1: Verify function exists
SELECT auth.clerk_user_id();
-- Output: NULL (because we're using service role, not a Clerk JWT)

-- Test 2: Verify RLS policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('email_events', 'user_workspaces')
LIMIT 5;
-- Output: You should see policies like "email_events_user_workspace_access"
```

### In Your App (After signing in):

```typescript
// Browser console:
const token = await window.Clerk?.session?.getToken({ template: 'supabase' });
console.log(token);
// Output: Long JWT string starting with "eyJ..."

// The JWT claims should include:
{
  "sub": "user_abc123",    // Your Clerk user ID
  "aud": "authenticated",  // From custom claims
  "role": "authenticated", // From custom claims
  ...
}
```

---

## Troubleshooting

### "Signing key is required" Error
❌ **Wrong:** You toggled ON "Custom signing key"
✅ **Fix:** Toggle it OFF and leave the signing key field empty

### JWKS Endpoint not found
❌ **Wrong:** You're using the wrong domain
✅ **Fix:** Use your actual Clerk domain (e.g., `vocal-adder-96.clerk.accounts.dev`)

### RLS blocks all queries
❌ **Wrong:** JWT not configured correctly
✅ **Fix:** 
1. Verify custom claims include `"aud": "authenticated"`
2. Verify Supabase JWKS URL matches Clerk JWKS Endpoint
3. Verify JWT is being sent to Supabase in Authorization header

---

## What Each Setting Does

| Setting | Value | Why |
|---------|-------|-----|
| Template Name | `supabase` | Must match `getToken({ template: 'supabase' })` in your app |
| Token Lifetime | 60 seconds | Short-lived tokens are more secure |
| JWKS Endpoint | `.well-known/jwks.json` | Supabase uses this to verify JWT signatures |
| Custom Claims | `{ "aud": "authenticated" }` | Tells Supabase this is an authenticated user |
| Custom Signing Key | OFF | Use Clerk's default (don't use custom) |

---

## The Full Flow

```
1. User signs in with Clerk
   → Clerk creates JWT with custom claims

2. Your app calls getToken({ template: 'supabase' })
   → Gets the JWT token

3. Your app sends JWT to Supabase
   Authorization: Bearer eyJ...

4. Supabase receives request
   → Verifies JWT signature using Clerk's JWKS endpoint
   → Extracts user ID from "sub" claim
   → Checks RLS policies
   → Returns only authorized data

5. User sees dashboard with their data only
   → RLS prevents cross-workspace data access
```

---

**All set! Now proceed to Step 2 in the main setup guide.**

