'use client';

/**
 * Dashboard Settings Panel
 * 
 * Side panel for customizing dashboard widget visibility
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardWidget } from '@/hooks/use-dashboard-layout';
import { cn } from '@/lib/utils';

interface DashboardSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidget[];
  onToggleWidget: (widgetId: string) => void;
  onResetLayout: () => void;
}

export function DashboardSettingsPanel({
  open,
  onOpenChange,
  widgets,
  onToggleWidget,
  onResetLayout,
}: DashboardSettingsPanelProps) {
  const handleReset = () => {
    if (confirm('Reset dashboard to default layout? This will clear your customizations.')) {
      onResetLayout();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Customize Dashboard
                </h2>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <X className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Widget Visibility */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Widget Visibility
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Toggle which widgets appear on your dashboard
                </p>

                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg transition-colors',
                        widget.canHide
                          ? 'hover:bg-[var(--surface-elevated)]'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Checkbox
                        checked={widget.visible}
                        onCheckedChange={() => {
                          if (widget.canHide) {
                            onToggleWidget(widget.id);
                          }
                        }}
                        disabled={!widget.canHide}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {widget.label}
                        </p>
                        {!widget.canHide && (
                          <p className="text-xs text-[var(--text-secondary)]">
                            Required widget
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  💡 Tip
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Hover over widgets and use the drag handle (⋮⋮) to reorder them. Your
                  layout will be saved automatically.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default Layout
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
