'use client';

import { useState } from 'react';
import { Header } from './header';
import { CommandPalette } from './command-palette';
import { WorkspaceProvider } from '@/lib/workspace-context';
import { SWRProvider } from '@/lib/swr-config';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface ClientShellProps {
  children: React.ReactNode;
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
 * 
 * By separating this from app/layout.tsx, we allow the root layout
 * to remain a server component, which:
 * - Improves initial page load performance
 * - Allows for proper metadata handling
 * - Prepares for future auth integration (Clerk)
 */
export function ClientShell({ children }: ClientShellProps) {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <SWRProvider>
      <WorkspaceProvider>
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-purple/5" />
        <div className="absolute inset-0 dot-pattern opacity-30" />
      </div>

      {/* Header */}
      <Header onCommandOpen={() => setCommandOpen(true)} />

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Command palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </WorkspaceProvider>
    </SWRProvider>
  );
}

