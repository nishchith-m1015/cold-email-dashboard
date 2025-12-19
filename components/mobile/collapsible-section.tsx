/**
 * CollapsibleSection - Progressive disclosure component for mobile
 * 
 * Phase 38: Mobile Sovereignty - Pillar 5: Progressive Disclosure Engine
 * 
 * Hides secondary content behind expandable sections on mobile.
 * Desktop shows everything by default; mobile collapses by default.
 * 
 * Features:
 * - Smooth accordion animation
 * - Can be forced open on desktop
 * - Customizable trigger appearance
 * - Preserves expanded state in localStorage
 */

'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  /** Unique ID for localStorage state persistence */
  id: string;
  /** Title shown in the header/trigger */
  title: string;
  /** Optional subtitle for more context */
  subtitle?: string;
  /** Content to show when expanded */
  children: ReactNode;
  /** Icon to show before the title */
  icon?: ReactNode;
  /** Start collapsed on mobile (default: true on mobile, false on desktop) */
  defaultCollapsed?: boolean;
  /** Force section to always be visible (no collapse) on desktop */
  forceOpenOnDesktop?: boolean;
  /** Additional classes for the wrapper */
  className?: string;
  /** Number of items/count to show in header badge */
  itemCount?: number;
}

export function CollapsibleSection({
  id,
  title,
  subtitle,
  children,
  icon,
  defaultCollapsed,
  forceOpenOnDesktop = true,
  className,
  itemCount,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Detect viewport size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`collapsible_${id}`);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    } else {
      // Default: collapsed on mobile, expanded on desktop
      setIsExpanded(defaultCollapsed !== undefined ? !defaultCollapsed : !isMobile);
    }
  }, [id, defaultCollapsed, isMobile]);

  // Save state when changed
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(`collapsible_${id}`, String(newState));
  };

  // On desktop with forceOpenOnDesktop, always show content
  const shouldShowContent = (forceOpenOnDesktop && !isMobile) || isExpanded;

  return (
    <div className={cn('rounded-lg border border-border bg-surface', className)}>
      {/* Header / Trigger */}
      <button
        onClick={handleToggle}
        disabled={forceOpenOnDesktop && !isMobile}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left transition-colors',
          'hover:bg-surface-elevated/50',
          (forceOpenOnDesktop && !isMobile) && 'cursor-default hover:bg-transparent'
        )}
        aria-expanded={shouldShowContent}
        aria-controls={`content_${id}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 text-accent-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary truncate">{title}</h3>
              {itemCount !== undefined && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-accent-primary/10 text-accent-primary rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-text-secondary truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Chevron - hidden on desktop if forceOpen */}
        {!(forceOpenOnDesktop && !isMobile) && (
          <motion.div
            animate={{ rotate: shouldShowContent ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 text-text-secondary"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {shouldShowContent && (
          <motion.div
            id={`content_${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div 
              ref={contentRef}
              className="px-4 pb-4 border-t border-border"
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * SeeMoreButton - "See More" / "See Less" toggle for truncated lists
 * 
 * Shows first N items, with button to reveal remaining items.
 */
interface SeeMoreProps<T> {
  /** All items to display */
  items: T[];
  /** Number of items to show initially */
  initialCount?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Custom className for the container */
  className?: string;
}

export function SeeMore<T>({
  items,
  initialCount = 3,
  renderItem,
  className,
}: SeeMoreProps<T>) {
  const [showAll, setShowAll] = useState(false);
  
  const visibleItems = showAll ? items : items.slice(0, initialCount);
  const hiddenCount = items.length - initialCount;
  const hasMore = hiddenCount > 0;

  return (
    <div className={cn('space-y-2', className)}>
      {visibleItems.map((item, index) => renderItem(item, index))}
      
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={cn(
            'w-full py-2 text-sm font-medium text-accent-primary',
            'hover:text-accent-primary/80 transition-colors',
            'flex items-center justify-center gap-1'
          )}
        >
          {showAll ? (
            <>Show Less</>
          ) : (
            <>See {hiddenCount} More</>
          )}
          <motion.div
            animate={{ rotate: showAll ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </button>
      )}
    </div>
  );
}
