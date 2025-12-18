'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Mail, BarChart3, FileText, X, FolderSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';

type ResultType = 'contact' | 'campaign' | 'page';

interface ApiResponse {
  campaigns: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; email: string; name: string; company?: string }>;
  pages: Array<{ id: string; title: string; url: string }>;
}

interface PaletteItem {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  url: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { workspaceId } = useWorkspace();

  const performSearch = useCallback(
    async (query: string) => {
      if (!query || query.length < 2) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          query,
          workspace_id: workspaceId || 'default',
        });

        const response = await fetch(`/api/search?${params}`);
        if (response.ok) {
          const data: ApiResponse = await response.json();
          const next: PaletteItem[] = [];

          (data.campaigns || []).forEach((c) => {
            next.push({
              id: `campaign-${c.id}`,
              type: 'campaign',
              title: c.name,
              subtitle: 'Campaign • Go to Analytics',
              url: `/analytics?campaign=${encodeURIComponent(c.id)}`,
            });
          });

          (data.contacts || []).forEach((c) => {
            next.push({
              id: `contact-${c.id}`,
              type: 'contact',
              title: c.name || c.email,
              subtitle: c.company ? `${c.email} • ${c.company}` : c.email,
              url: `/contacts?search=${encodeURIComponent(c.email || c.name)}`,
            });
          });

          (data.pages || []).forEach((p) => {
            next.push({
              id: `page-${p.id}`,
              type: 'page',
              title: p.title,
              subtitle: 'Page',
              url: p.url,
            });
          });

          setItems(next);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        performSearch(search);
      } else {
        setItems([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, performSearch]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setSearch('');
      setItems([]);
    }
  }, [open]);

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (item: PaletteItem) => {
    router.push(item.url);
    onOpenChange(false);
  };

  const grouped = useMemo(() => {
    const groups: Record<ResultType, PaletteItem[]> = { contact: [], campaign: [], page: [] };
    items.forEach((i) => groups[i.type].push(i));
    return groups;
  }, [items]);

  const getIcon = (type: ResultType) => {
    switch (type) {
      case 'contact':
        return Mail;
      case 'campaign':
        return BarChart3;
      case 'page':
        return FileText;
      default:
        return Search;
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <Command
          className="rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 text-text-secondary mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search contacts, campaigns, or metrics..."
              className="flex-1 bg-transparent py-4 text-text-primary placeholder:text-text-secondary outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-1 rounded-md hover:bg-surface-elevated transition-colors"
              >
                <X className="h-4 w-4 text-text-secondary" />
              </button>
            )}
          </div>

          {/* Results List */}
          <Command.List className="max-h-96 overflow-y-auto p-2">
            {loading && (
              <div className="py-8 text-center text-sm text-text-secondary">
                Searching...
              </div>
            )}

            {!loading && search && items.length === 0 && (
              <div className="py-8 text-center text-sm text-text-secondary">
                  No results found for “{search}”
                </div>
            )}

            {!loading && !search && (
              <div className="py-8 text-center">
                <Search className="h-12 w-12 text-text-secondary opacity-50 mx-auto mb-3" />
                <p className="text-sm text-text-secondary">
                  Type to search contacts, campaigns, or metrics
                </p>
                <p className="text-xs text-text-secondary mt-2">
                  Press <kbd className="px-2 py-1 bg-surface-elevated rounded border border-border">ESC</kbd> to close
                </p>
              </div>
            )}

            {!loading && items.length > 0 && (
              <>
                {(['contact', 'campaign', 'page'] as ResultType[]).map(type => {
                  const typeResults = grouped[type];
                  if (!typeResults || typeResults.length === 0) return null;

                  return (
                    <div key={type} className="mb-4 last:mb-0">
                      <Command.Group
                        heading={
                          type === 'contact' ? '📧 Contacts' :
                          type === 'campaign' ? '🚀 Campaigns' :
                          '📄 Pages'
                        }
                        className="px-2 py-1.5 text-xs font-semibold text-text-secondary"
                      >
                        {typeResults.map((result) => {
                          const Icon = getIcon(result.type);
                          return (
                            <Command.Item
                              key={result.id}
                              value={`${result.type}-${result.id}`}
                              onSelect={() => handleSelect(result)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-elevated transition-colors data-[selected=true]:bg-surface-elevated group"
                            >
                              <div className={cn(
                                'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                                result.type === 'contact' && 'bg-accent-primary/10',
                                result.type === 'campaign' && 'bg-accent-success/10',
                                result.type === 'page' && 'bg-accent-purple/10'
                              )}>
                                <Icon className={cn(
                                  'h-5 w-5',
                                  result.type === 'contact' && 'text-accent-primary',
                                  result.type === 'campaign' && 'text-accent-success',
                                  result.type === 'page' && 'text-accent-purple'
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                                  {result.title}
                                </p>
                                <p className="text-xs text-text-secondary truncate">
                                  {result.subtitle}
                                </p>
                              </div>
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                    </div>
                  );
                })}
              </>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface-elevated/50">
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded border border-border">ESC</kbd>
                Close
              </span>
            </div>
            {items.length > 0 && (
              <span className="text-xs text-text-secondary">
                {items.length} result{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </Command>
      </div>
    </>
  );
}

