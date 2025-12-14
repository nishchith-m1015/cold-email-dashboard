'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  Search,
  FileText,
  MessageSquareReply,
  DollarSign,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMANDS = [
  {
    group: 'Navigation',
    items: [
      { id: 'overview', label: 'Go to Overview', icon: LayoutDashboard, href: '/' },
      { id: 'analytics', label: 'Go to Analytics', icon: BarChart3, href: '/analytics' },
      { id: 'contacts', label: 'Go to Contacts', icon: Users, href: '/contacts' },
      { id: 'settings', label: 'Open Settings', icon: Settings, href: '/settings' },
    ],
  },
  {
    group: 'Quick Actions',
    items: [
      { id: 'reply-rate', label: 'View Reply Rate', icon: MessageSquareReply, action: 'ask:reply rate' },
      { id: 'cost', label: 'View LLM Costs', icon: DollarSign, action: 'ask:llm cost' },
      { id: 'reports', label: 'Generate Report', icon: FileText, action: 'report' },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Close on Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (item: { href?: string; action?: string }) => {
    onOpenChange(false);
    setSearch('');
    
    if (item.href) {
      router.push(item.href);
      } else if (item.action?.startsWith('ask:')) {
      // Could trigger Ask AI with this query
      /* eslint-disable-next-line no-console */
      console.log('Ask:', item.action.replace('ask:', ''));
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
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Command Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] z-50 -translate-x-1/2 w-full max-w-lg"
          >
            <Command
              className={cn(
                'rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden',
                '[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-secondary',
                '[&_[cmdk-group]]:px-2',
                '[&_[cmdk-input]]:h-12',
                '[&_[cmdk-item]]:px-4 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:cursor-pointer',
                '[&_[cmdk-item][data-selected=true]]:bg-surface-elevated'
              )}
            >
              {/* Input */}
              <div className="flex items-center border-b border-border px-4">
                <Search className="h-4 w-4 text-text-secondary shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search commands..."
                  className={cn(
                    'flex h-12 w-full bg-transparent py-3 px-3 text-sm text-text-primary placeholder:text-text-secondary/50',
                    'outline-none disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
              </div>

              {/* List */}
              <Command.List className="max-h-80 overflow-y-auto py-2">
                <Command.Empty className="py-6 text-center text-sm text-text-secondary">
                  No results found.
                </Command.Empty>

                {COMMANDS.map((group) => (
                  <Command.Group key={group.group} heading={group.group}>
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.label}
                        onSelect={() => handleSelect(item)}
                        className="flex items-center gap-3 rounded-lg text-text-primary transition-colors"
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-surface-elevated">
                          <item.icon className="h-4 w-4 text-text-secondary" />
                        </div>
                        <span className="text-sm">{item.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-text-secondary">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated">↑</kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated">↵</kbd>
                    to select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-elevated">esc</kbd>
                  to close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

