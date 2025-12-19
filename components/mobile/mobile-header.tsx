/**
 * MobileHeader - Minimal top header for mobile screens
 * 
 * Phase 38: Mobile Sovereignty - Navigation
 * 
 * Features:
 * - Minimal height (56px + safe area)
 * - Menu hamburger (left) - opens drawer
 * - Logo (center) - links to home
 * - Profile avatar (right) - opens Clerk profile
 * - Only visible on mobile (md:hidden)
 */

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onMenuOpen: () => void;
  className?: string;
}

export function MobileHeader({
  onMenuOpen,
  className,
}: MobileHeaderProps) {
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 md:hidden',
        'bg-background/90 backdrop-blur-lg',
        'border-b border-border',
        className
      )}
      style={{
        paddingTop: 'var(--safe-area-top, 0px)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Menu Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuOpen}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-elevated transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </motion.button>

        {/* Logo - Links to home like desktop */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg overflow-hidden shadow-lg">
            <Image src="/logo.png" alt="Logo" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <div className="text-sm font-semibold text-text-primary group-hover:text-slate-400 transition-colors">
            <p className="leading-tight">Cold Email</p>
            <p className="text-[8px] uppercase tracking-wider font-medium text-slate-400 opacity-70">Analytics</p>
          </div>
        </Link>

        {/* Profile Avatar - Opens Clerk Profile */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => openUserProfile()}
          className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-accent-primary/30 transition-all"
          aria-label="Profile settings"
        >
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.fullName || 'Profile'}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-white">
                {user?.firstName?.[0] || 'U'}
              </span>
            </div>
          )}
        </motion.button>
      </div>
    </header>
  );
}


