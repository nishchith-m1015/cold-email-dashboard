import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware - Route Protection (Clerk disabled)
 * 
 * Currently a passthrough middleware.
 * To enable Clerk authentication:
 * 1. Add Clerk environment variables
 * 2. Uncomment the Clerk imports and code below
 * 3. Set AUTH_CONFIG.enabled = true in lib/auth.ts
 * 
 * See docs/CLERK_INTEGRATION.md for full setup instructions.
 */

// CLERK DISABLED - Passthrough middleware
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

/* 
 * CLERK ENABLED VERSION - Uncomment when ready:
 * 
 * import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
 * 
 * const isPublicRoute = createRouteMatcher([
 *   '/',
 *   '/sign-in(.*)',
 *   '/sign-up(.*)',
 *   '/api/events',
 *   '/api/cost-events',
 *   '/api/llm-usage',
 *   '/api/track/(.*)',
 *   '/api/webhook/(.*)',
 *   '/api/cache',
 *   '/api/sheets',
 * ]);
 * 
 * export default clerkMiddleware(async (auth, request) => {
 *   if (!isPublicRoute(request)) {
 *     await auth.protect();
 *   }
 * });
 */
