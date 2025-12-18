'use client';

/**
 * Floating Action Button (FAB)
 * 
 * Mobile-first quick action button with expandable menu.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, FileText, Users, Settings, Zap } from 'lucide-react';
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

const defaultActions: FABAction[] = [
  {
    id: 'new-campaign',
    label: 'New Campaign',
    icon: <Zap className="h-5 w-5" />,
    href: '/?new=campaign',
  },
  {
    id: 'new-contact',
    label: 'Add Contact',
    icon: <Users className="h-5 w-5" />,
    href: '/contacts?new=true',
  },
  {
    id: 'new-sequence',
    label: 'Create Sequence',
    icon: <FileText className="h-5 w-5" />,
    href: '/sequences?new=true',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
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

      {/* FAB Container - Only visible on mobile */}
      <div className={cn('fixed bottom-6 right-6 z-50 md:hidden', className)}>
        {/* Action Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
            >
              {defaultActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-lg hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {action.label}
                  </span>
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    {action.icon}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center justify-center h-14 w-14 rounded-full shadow-xl',
            'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)]',
            'text-white transition-transform',
            isOpen && 'rotate-45'
          )}
          style={{ transitionDuration: '200ms' }}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </motion.button>
      </div>
    </>
  );
}
