import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Clerk Middleware - Route Protection
 * 
 * Public routes (no auth required):
 * - Home page (for now, can be made protected later)
 * - Sign-in/up pages
 * - API webhooks (use token auth instead)
 * - Tracking endpoints (open/click)
 */

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/events',
  '/api/cost-events',
  '/api/llm-usage',
  '/api/track/(.*)',
  '/api/webhook/(.*)',
  '/api/cache',
  '/api/sheets',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

