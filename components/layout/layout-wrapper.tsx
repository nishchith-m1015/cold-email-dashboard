'use client';

import { usePathname } from 'next/navigation';
import { ClientShell } from './client-shell';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * LayoutWrapper - Conditionally wraps content based on route
 * 
 * Auth pages (/sign-in, /sign-up) render without the dashboard shell
 * All other pages get the full ClientShell with header, navigation, etc.
 */
export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Auth pages should render without the dashboard shell
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');
  
  if (isAuthPage) {
    // Auth pages get minimal wrapper - just the background
    return (
      <div className="min-h-screen bg-background">
        {/* Background pattern for auth pages */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-purple/5" />
          <div className="absolute inset-0 dot-pattern opacity-20" />
        </div>
        {children}
      </div>
    );
  }
  
  // All other pages get the full dashboard shell
  return <ClientShell>{children}</ClientShell>;
}


