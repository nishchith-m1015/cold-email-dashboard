'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, Mail, BarChart3, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';

interface SearchResult {
  type: 'contact' | 'campaign' | 'metric';
  id: string;
  title: string;
  subtitle: string;
  url?: string;
  highlight?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { workspaceId } = useWorkspace();

  // Fetch search results
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        query,
        limit: '10',
        workspace_id: workspaceId || 'default',
      });

      const response = await fetch(`/api/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        performSearch(search);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, performSearch]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
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

  const handleSelect = (result: SearchResult) => {
    if (result.url) {
      router.push(result.url);
      onOpenChange(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return Mail;
      case 'campaign':
        return BarChart3;
      case 'metric':
        return TrendingUp;
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

            {!loading && search && results.length === 0 && (
              <div className="py-8 text-center text-sm text-text-secondary">
                No results found for "{search}"
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

            {!loading && results.length > 0 && (
              <>
                {/* Group results by type */}
                {['contact', 'campaign', 'metric'].map(type => {
                  const typeResults = results.filter(r => r.type === type);
                  if (typeResults.length === 0) return null;

                  return (
                    <div key={type} className="mb-4 last:mb-0">
                      <Command.Group
                        heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}
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
                                result.type === 'metric' && 'bg-accent-purple/10'
                              )}>
                                <Icon className={cn(
                                  'h-5 w-5',
                                  result.type === 'contact' && 'text-accent-primary',
                                  result.type === 'campaign' && 'text-accent-success',
                                  result.type === 'metric' && 'text-accent-purple'
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
            {results.length > 0 && (
              <span className="text-xs text-text-secondary">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </Command>
      </div>
    </>
  );
}

