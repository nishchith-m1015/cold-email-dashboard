/**
 * Auth Module - Clerk Integration Foundation
 * 
 * This module provides authentication utilities for the dashboard.
 * Currently configured for preparation - Clerk packages need to be installed.
 * 
 * To enable Clerk authentication:
 * 1. Run: npm install @clerk/nextjs
 * 2. Add environment variables to .env.local:
 *    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
 *    - CLERK_SECRET_KEY
 * 3. Uncomment the Clerk imports and implementations below
 */

import { DEFAULT_WORKSPACE_ID } from './supabase';
import type { Workspace } from './workspace-context';

// ============================================
// AUTH CONFIGURATION
// ============================================

export const AUTH_CONFIG = {
  // Enable/disable auth (Clerk is now installed)
  enabled: true, // Clerk authentication is active
  
  // Routes that should be public (no auth required)
  publicRoutes: [
    '/',
    '/api/events',
    '/api/cost-events',
    '/api/track/open',
    '/api/track/click',
    '/api/llm-usage',
    '/api/webhook/(.*)',
  ],
  
  // Routes that should always be protected
  protectedRoutes: [
    '/analytics',
    '/settings',
    '/admin/(.*)',
  ],
  
  // Default redirect after sign in
  afterSignInUrl: '/',
  
  // Default redirect after sign up
  afterSignUpUrl: '/',
};

// ============================================
// USER TYPES
// ============================================

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  workspaces: Workspace[];
  currentWorkspaceId: string;
}

// ============================================
// AUTH UTILITIES (Placeholder implementations)
// ============================================

/**
 * Get the current user from Clerk
 * Replace with actual Clerk implementation after installation
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // TODO: Replace with Clerk auth() when installed
  // import { auth } from '@clerk/nextjs/server';
  // const { userId } = auth();
  // if (!userId) return null;
  // return fetchUserWithWorkspaces(userId);
  
  // Placeholder for development
  return {
    id: 'dev-user',
    email: 'admin@smartieagents.com',
    firstName: 'Smartie',
    lastName: 'Agents',
    imageUrl: null,
    workspaces: [{
      id: DEFAULT_WORKSPACE_ID,
      name: 'Default Workspace',
      slug: 'default',
      plan: 'free',
    }],
    currentWorkspaceId: DEFAULT_WORKSPACE_ID,
  };
}

/**
 * Get the current user's workspace ID
 */
export async function getCurrentWorkspaceId(): Promise<string> {
  const user = await getCurrentUser();
  return user?.currentWorkspaceId || DEFAULT_WORKSPACE_ID;
}

/**
 * Check if a route should be public (no auth required)
 */
export function isPublicRoute(pathname: string): boolean {
  return AUTH_CONFIG.publicRoutes.some(route => {
    const regex = new RegExp(`^${route.replace(/\(.*\)/, '.*')}$`);
    return regex.test(pathname);
  });
}

/**
 * Check if current user has access to a workspace
 */
export async function hasWorkspaceAccess(workspaceId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.workspaces.some(w => w.id === workspaceId);
}

// ============================================
// WEBHOOK TOKEN VALIDATION
// ============================================

/**
 * Validate webhook token for API routes
 * This is used for n8n and other integrations that don't use Clerk auth
 */
export function validateWebhookToken(token: string | null): boolean {
  const expectedToken = process.env.DASH_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    console.warn('DASH_WEBHOOK_TOKEN not configured - allowing all requests');
    return true;
  }
  
  return token === expectedToken;
}

/**
 * Get webhook token from request headers
 */
export function getWebhookToken(headers: Headers): string | null {
  return headers.get('x-webhook-token');
}

// ============================================
// CLERK INTEGRATION INSTRUCTIONS
// ============================================

/**
 * INSTALLATION STEPS:
 * 
 * 1. Install Clerk:
 *    npm install @clerk/nextjs
 * 
 * 2. Add environment variables to .env.local:
 *    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
 *    CLERK_SECRET_KEY=sk_test_...
 *    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
 *    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
 * 
 * 3. Create middleware.ts in the root:
 *    import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
 *    
 *    const isPublicRoute = createRouteMatcher([
 *      '/',
 *      '/api/events',
 *      '/api/cost-events',
 *      '/api/track/(.*)',
 *      '/api/llm-usage',
 *    ]);
 *    
 *    export default clerkMiddleware((auth, request) => {
 *      if (!isPublicRoute(request)) {
 *        auth().protect();
 *      }
 *    });
 *    
 *    export const config = {
 *      matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
 *    };
 * 
 * 4. Wrap app/layout.tsx with ClerkProvider:
 *    import { ClerkProvider } from '@clerk/nextjs';
 *    
 *    export default function RootLayout({ children }) {
 *      return (
 *        <ClerkProvider>
 *          <html>
 *            <body>{children}</body>
 *          </html>
 *        </ClerkProvider>
 *      );
 *    }
 * 
 * 5. Create sign-in and sign-up pages:
 *    app/sign-in/[[...sign-in]]/page.tsx
 *    app/sign-up/[[...sign-up]]/page.tsx
 * 
 * 6. Update AUTH_CONFIG.enabled to true above
 */

