'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Header } from './header';
import { CommandPalette } from '@/components/ui/command-palette';
import { OnboardingTour } from '@/components/onboarding/onboarding-tour';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace-context';
import { SWRProvider } from '@/lib/swr-config';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { MobileBottomNav, MobileHeader, MobileDrawer } from '@/components/mobile';
import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/nextjs';
import { Zap, Mail, BarChart3, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientShellProps {
  children: React.ReactNode;
}

// Component to check workspace membership and redirect if needed
function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { needsOnboarding, isLoading } = useWorkspace();
  
  useEffect(() => {
    // Don't redirect if on join page or still loading
    if (pathname === '/join' || isLoading) return;
    
    // Redirect to join page if user needs onboarding
    if (needsOnboarding) {
      router.push('/join');
    }
  }, [needsOnboarding, isLoading, pathname, router]);

  // Show loading while checking workspace access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  // On join page, always show content
  if (pathname === '/join') {
    return <>{children}</>;
  }

  // If needs onboarding, show nothing (redirect will happen)
  if (needsOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * ClientShell - Client-side wrapper for the application
 * 
 * This component handles all client-side layout logic:
 * - SWR configuration with request deduplication
 * - Workspace context for multi-tenant support
 * - Error boundary for graceful error handling
 * - Command palette state management
 * - Header with navigation
 * - Background patterns
 * - Main content area
 * - Auth gating (shows landing for signed-out users)
 * 
 * By separating this from app/layout.tsx, we allow the root layout
 * to remain a server component, which:
 * - Improves initial page load performance
 * - Allows for proper metadata handling
 * - Prepares for future auth integration (Clerk)
 */
export function ClientShell({ children }: ClientShellProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();
  
  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onCommandPalette: () => setCommandOpen(true),
  });

  return (
    <SWRProvider>
      <WorkspaceProvider>
        {/* Background pattern - Hidden on /join page */}
        {pathname !== '/join' && (
          <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-purple/5" />
            <div className="absolute inset-0 dot-pattern opacity-30" />
          </div>
        )}

        {/* Desktop Header - Hidden on mobile via internal md:hidden classes */}
        <Suspense fallback={null}>
          <Header onCommandOpen={() => setCommandOpen(true)} />
        </Suspense>

        {/* Mobile Header - Only visible below md breakpoint */}
        <MobileHeader 
          onMenuOpen={() => setMobileDrawerOpen(true)} 
        />

        {/* Mobile Drawer - Slide-out navigation */}
        <MobileDrawer 
          open={mobileDrawerOpen} 
          onClose={() => setMobileDrawerOpen(false)} 
        />

        {/* Main content - Only show dashboard when signed in */}
        <SignedIn>
          <WorkspaceGate>
            {/* Remove padding/max-width on /join page for full-screen effect */}
            {/* Add bottom padding on mobile for bottom nav */}
            <main className={cn(
              pathname === '/join' ? '' : 'max-w-[1600px] mx-auto px-4 md:px-6 py-8',
              'pb-20 md:pb-8' // Extra padding for mobile bottom nav
            )} data-tour="welcome">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>

            {/* Command palette - Only for signed-in users */}
            <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
            
            {/* Onboarding tour for first-time users */}
            <OnboardingTour />
            
            {/* Mobile Floating Action Button */}
            <FloatingActionButton />

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
          </WorkspaceGate>
        </SignedIn>

        {/* Landing page for signed-out users */}
        <SignedOut>
          <main className="max-w-[1600px] mx-auto px-6 py-16">
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              {/* Hero Section */}
              <div className="relative mb-8">
                <div className="flex items-center justify-center h-20 w-20 rounded-2xl overflow-hidden shadow-2xl">
                  <Image src="/logo.png" alt="Logo" width={80} height={80} className="w-full h-full object-cover" />
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight">
                Cold Email Analytics
              </h1>
              <p className="text-lg text-text-secondary max-w-xl mb-8">
                Track your email campaigns, monitor deliverability, and optimize your outreach with real-time analytics.
              </p>

              <SignInButton mode="redirect">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 transition-opacity text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/25">
                  <Mail className="h-5 w-5" />
                  Sign In to Dashboard
                </Button>
              </SignInButton>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl">
                <div className="p-6 rounded-xl bg-surface border border-border">
                  <div className="h-10 w-10 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-4">
                    <Mail className="h-5 w-5 text-accent-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Email Tracking</h3>
                  <p className="text-sm text-text-secondary">Monitor opens, clicks, and replies across all your campaigns.</p>
                </div>

                <div className="p-6 rounded-xl bg-surface border border-border">
                  <div className="h-10 w-10 rounded-lg bg-accent-purple/10 flex items-center justify-center mb-4">
                    <BarChart3 className="h-5 w-5 text-accent-purple" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Real-time Analytics</h3>
                  <p className="text-sm text-text-secondary">Get instant insights into campaign performance and trends.</p>
                </div>

                <div className="p-6 rounded-xl bg-surface border border-border">
                  <div className="h-10 w-10 rounded-lg bg-accent-success/10 flex items-center justify-center mb-4">
                    <Shield className="h-5 w-5 text-accent-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Cost Management</h3>
                  <p className="text-sm text-text-secondary">Track LLM costs and optimize your email generation budget.</p>
                </div>
              </div>
            </div>
          </main>
        </SignedOut>
      </WorkspaceProvider>
    </SWRProvider>
  );
}

