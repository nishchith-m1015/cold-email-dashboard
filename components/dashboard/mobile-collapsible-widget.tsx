/**
 * MobileCollapsibleWidget - Progressive disclosure wrapper for dashboard widgets
 * 
 * Phase 38: Mobile Sovereignty - Pillar 5: Progressive Disclosure
 * 
 * Wraps dashboard widgets in collapsible sections on mobile only.
 * On desktop, content is always visible with no collapse affordance.
 * 
 * Usage:
 * <MobileCollapsibleWidget id="charts" title="Charts" icon={<BarChart3 />}>
 *   <TimeSeriesChart ... />
 * </MobileCollapsibleWidget>
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileCollapsibleWidgetProps {
  id: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Default collapsed state on mobile */
  defaultCollapsed?: boolean;
  className?: string;
  /** Number to show in badge */
  count?: number;
}

export function MobileCollapsibleWidget({
  id,
  title,
  icon,
  children,
  defaultCollapsed = true,
  className,
  count,
}: MobileCollapsibleWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load saved state
  useEffect(() => {
    if (!isMobile) return;
    const saved = localStorage.getItem(`widget_${id}`);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
  }, [id, isMobile]);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`widget_${id}`, String(newState));
  };

  // Desktop: always show content, no wrapper
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  // Mobile: collapsible section
  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left active:bg-surface-elevated/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-accent-primary">{icon}</div>}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">{title}</span>
            {count !== undefined && (
              <span className="px-2 py-0.5 text-xs font-medium bg-accent-primary/10 text-accent-primary rounded-full">
                {count}
              </span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-text-secondary"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
