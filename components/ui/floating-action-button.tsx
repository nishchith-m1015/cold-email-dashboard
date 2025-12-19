'use client';

/**
 * Floating Action Button (FAB)
 * 
 * Mobile-first quick action button for creating new items.
 * Smaller, focused on creation actions only.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Zap, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
}

interface FloatingActionButtonProps {
  className?: string;
}

// Only creation actions - no Settings (bottom nav has that)
const defaultActions: FABAction[] = [
  {
    id: 'new-campaign',
    label: 'New Campaign',
    icon: <Zap className="h-4 w-4" />,
    href: '/?new=campaign',
  },
  {
    id: 'new-contact',
    label: 'Add Contact',
    icon: <Users className="h-4 w-4" />,
    href: '/contacts?new=true',
  },
  {
    id: 'new-sequence',
    label: 'Create Sequence',
    icon: <FileText className="h-4 w-4" />,
    href: '/sequences?new=true',
  },
];

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleAction = (action: FABAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      router.push(action.href);
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB Container - Smaller, positioned above bottom nav */}
      <div 
        className={cn('fixed z-50 md:hidden', className)}
        style={{
          bottom: 'calc(80px + var(--safe-area-bottom, 0px))',
          right: '16px',
        }}
      >
        {/* Action Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-14 right-0 flex flex-col gap-2 items-end"
            >
              {defaultActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-lg hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {action.label}
                  </span>
                  <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    {action.icon}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button - Smaller size */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center justify-center h-12 w-12 rounded-full shadow-xl',
            'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)]',
            'text-white transition-transform',
            isOpen && 'rotate-45'
          )}
          style={{ transitionDuration: '200ms' }}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </motion.button>
      </div>
    </>
  );
}

