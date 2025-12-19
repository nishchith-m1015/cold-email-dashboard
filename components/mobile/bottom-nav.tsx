/**
 * MobileBottomNav - Fixed bottom tab bar for mobile navigation
 * 
 * Phase 38: Mobile Sovereignty - Thumb-Zone Navigation
 * 
 * Features:
 * - Fixed to bottom with safe area handling
 * - 4 primary navigation tabs
 * - Active state indication
 * - Only visible on mobile (md:hidden)
 */

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart3, Users, Mail, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavTab {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  matchPath: string | string[];
}

// Simplified 5-tab navigation - no redundancy with drawer
const tabs: NavTab[] = [
  {
    href: '/',
    icon: LayoutDashboard,
    label: 'Home',
    matchPath: '/',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
    matchPath: '/analytics',
  },
  {
    href: '/contacts',
    icon: Users,
    label: 'Contacts',
    matchPath: '/contacts',
  },
  {
    href: '/sequences',
    icon: Mail,
    label: 'Sequences',
    matchPath: '/sequences',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
    matchPath: '/settings',
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Preserve URL params when navigating
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

  // Don't show on auth pages
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname === '/join') {
    return null;
  }

  const isActive = (tab: NavTab) => {
    if (Array.isArray(tab.matchPath)) {
      return tab.matchPath.some(path => pathname === path || pathname.startsWith(path + '/'));
    }
    return pathname === tab.matchPath || (tab.matchPath === '/' ? pathname === '/' : pathname.startsWith(tab.matchPath));
  };

  return (
    <nav 
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{
        paddingBottom: 'var(--safe-area-bottom, 0px)',
      }}
    >
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-surface/95 backdrop-blur-lg border-t border-border" />
      
      {/* Tab bar */}
      <div className="relative flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={`${tab.href}${query}`}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'min-w-touch min-h-touch px-3 py-1',
                'transition-colors duration-200',
                active ? 'text-accent-primary' : 'text-text-secondary'
              )}
            >
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="bottomnav-active"
                  className="absolute -top-0.5 w-8 h-1 bg-accent-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              <Icon 
                className={cn(
                  'h-5 w-5 mb-0.5 transition-transform',
                  active && 'scale-110'
                )} 
              />
              <span className={cn(
                'text-[10px] font-medium',
                active && 'font-semibold'
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

