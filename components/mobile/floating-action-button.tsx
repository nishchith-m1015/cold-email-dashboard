/**
 * FloatingActionButton - Primary action button for mobile
 * 
 * Phase 38: Mobile Sovereignty - Thumb-Zone Actions
 * 
 * Features:
 * - Fixed position in thumb zone (bottom-right)
 * - Primary action (New Campaign by default)
 * - Press feedback with scale animation
 * - Only visible on mobile (md:hidden)
 */

'use client';

import { motion } from 'framer-motion';
import { Plus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: LucideIcon;
  label?: string;
  className?: string;
}

export function FloatingActionButton({
  onClick,
  icon: Icon = Plus,
  label = 'Create new campaign',
  className,
}: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        // Positioning - above bottom nav
        'fixed z-40 md:hidden',
        'bottom-20 right-4',
        // Size - touch friendly
        'h-14 w-14',
        // Style
        'flex items-center justify-center',
        'rounded-full',
        'bg-accent-primary text-white',
        'shadow-lg shadow-accent-primary/30',
        // Active feedback
        'active:brightness-90',
        'transition-all duration-200',
        className
      )}
      style={{
        // Adjust for safe area
        bottom: 'calc(80px + var(--safe-area-bottom, 0px))',
      }}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </motion.button>
  );
}
