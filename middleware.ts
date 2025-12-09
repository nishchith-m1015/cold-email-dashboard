import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk Middleware - Route Protection
 * 
 * Protected routes (require auth):
 * - All dashboard pages (/, /analytics, etc.)
 * 
 * Public routes (no auth required):
 * - Sign-in/up pages
 * - API webhooks (use token auth instead)
 * - Tracking endpoints (open/click pixels)
 */

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // API routes that need external access (n8n webhooks, tracking pixels)
  '/api/events',
  '/api/cost-events',
  '/api/llm-usage',
  '/api/track/(.*)',
  '/api/webhook/(.*)',
  '/api/health',
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
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
