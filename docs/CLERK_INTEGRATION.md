# Clerk Authentication Integration Guide

This guide explains how to enable Clerk authentication for the Cold Email Dashboard.

## Prerequisites

- Clerk account (free tier available at [clerk.com](https://clerk.com))
- Your Clerk Publishable Key and Secret Key

## Installation

### 1. Install Clerk Package

```bash
npm install @clerk/nextjs
```

### 2. Environment Variables

Add to `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Clerk URLs (optional, defaults work for most cases)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 3. Create Middleware

Create `middleware.ts` in the project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/events',
  '/api/cost-events',
  '/api/track/(.*)',
  '/api/llm-usage',
  '/api/webhook/(.*)',
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
```

### 4. Update Root Layout

Update `app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs';
import { ClientShell } from '@/components/layout/client-shell';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-background text-text-primary antialiased">
          <ClientShell>
            {children}
          </ClientShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 5. Create Auth Pages

#### Sign In Page

Create `app/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn 
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-surface border border-border',
          }
        }}
      />
    </div>
  );
}
```

#### Sign Up Page

Create `app/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp 
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-surface border border-border',
          }
        }}
      />
    </div>
  );
}
```

### 6. Update Header for Auth

Update `components/layout/header.tsx` to use Clerk's UserButton:

```typescript
import { UserButton, SignInButton, useAuth } from '@clerk/nextjs';

// In the Header component, replace the profile button:
const { isSignedIn } = useAuth();

// Replace the profile dropdown with:
{isSignedIn ? (
  <UserButton 
    afterSignOutUrl="/"
    appearance={{
      elements: {
        avatarBox: 'h-8 w-8',
      }
    }}
  />
) : (
  <SignInButton mode="modal">
    <button className="btn-primary">Sign In</button>
  </SignInButton>
)}
```

### 7. Enable Auth in Config

In `lib/auth.ts`, set:

```typescript
export const AUTH_CONFIG = {
  enabled: true,
  // ...
};
```

## User ↔ Workspace Mapping

After sign-in, the user needs to be mapped to a workspace:

### 1. Sync User on First Login

Create `app/api/auth/sync/route.ts`:

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export async function POST() {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Check if user already has a workspace
  const { data: existing } = await supabaseAdmin
    .from('user_workspaces')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ workspaceId: existing[0].workspace_id });
  }

  // Create default workspace mapping
  const { error } = await supabaseAdmin
    .from('user_workspaces')
    .insert({
      user_id: userId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      role: 'owner',
    });

  if (error) {
    console.error('Failed to create workspace mapping:', error);
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
  }

  return NextResponse.json({ workspaceId: DEFAULT_WORKSPACE_ID });
}
```

### 2. Fetch User Workspaces

Add to `lib/auth.ts`:

```typescript
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase';

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  if (!supabaseAdmin) return [];

  const { data } = await supabaseAdmin
    .from('user_workspaces')
    .select(`
      workspace_id,
      role,
      workspaces (
        id,
        name,
        slug,
        plan
      )
    `)
    .eq('user_id', userId);

  if (!data) return [];

  return data.map(uw => ({
    id: uw.workspaces.id,
    name: uw.workspaces.name,
    slug: uw.workspaces.slug,
    plan: uw.workspaces.plan,
  }));
}
```

## Webhook Security

The dashboard uses `DASH_WEBHOOK_TOKEN` for n8n and other integrations. These routes remain accessible without Clerk auth but require the token:

- `/api/events` - Email events ingestion
- `/api/cost-events` - LLM cost tracking
- `/api/llm-usage` - LLM usage tracking
- `/api/track/open` - Email open tracking pixel
- `/api/track/click` - Click tracking redirect

## Testing

1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should be redirected to sign-in
4. After signing in, you should see the dashboard
5. Test that webhooks still work (they should not require Clerk auth)

## Troubleshooting

### "Missing Clerk Publishable Key"
- Ensure `.env.local` has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Restart the dev server after adding env vars

### Middleware Not Working
- Ensure `middleware.ts` is in the project root (not in `app/` or `src/`)
- Check the matcher config in middleware.ts

### Webhooks Blocked
- Verify the route is in the `isPublicRoute` matcher
- Webhooks should use `x-webhook-token` header, not Clerk auth

## Next Steps

After enabling auth:

1. Update the workspace context to fetch user's workspaces from Clerk
2. Add workspace creation UI for new users
3. Implement team invitations
4. Add role-based access control

