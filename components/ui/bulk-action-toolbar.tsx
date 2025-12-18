'use client';

/**
 * Bulk Action Toolbar
 * 
 * Floating toolbar that appears when items are selected
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermission, Permission } from '@/components/ui/permission-gate';

export interface BulkAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  requiresPermission?: Permission;
}

interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
}

export function BulkActionToolbar({
  selectedCount,
  onClearSelection,
  actions,
}: BulkActionToolbarProps) {
  const canWrite = usePermission('write');
  const canManage = usePermission('manage');

  const hasPermission = (action: BulkAction): boolean => {
    if (!action.requiresPermission) return true;
    if (action.requiresPermission === 'write') return canWrite;
    if (action.requiresPermission === 'manage') return canManage;
    return false;
  };

  const visibleActions = actions.filter(hasPermission);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-0 right-0 z-50 flex justify-center"
        >
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
            {/* Selected Count */}
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {selectedCount} selected
            </span>

            {/* Divider */}
            <div className="h-5 w-px bg-[var(--border)]" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              {visibleActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant === 'danger' ? 'danger' : 'ghost'}
                    size="sm"
                    onClick={action.onClick}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-5 w-px bg-[var(--border)]" />

            {/* Clear Selection */}
            <button
              onClick={onClearSelection}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
