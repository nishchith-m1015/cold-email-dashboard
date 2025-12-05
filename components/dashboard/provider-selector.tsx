'use client';

import { useState } from 'react';
import { Check, ChevronDown, Server } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { getProviderColor, CHART_COLORS } from '@/lib/constants';

// Known providers in the system
export const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', color: CHART_COLORS.openai },
  { id: 'anthropic', label: 'Anthropic', color: CHART_COLORS.anthropic },
  { id: 'google', label: 'Google', color: CHART_COLORS.google },
  { id: 'relevance_ai', label: 'Relevance AI', color: CHART_COLORS.relevance_ai },
  { id: 'apify', label: 'Apify', color: CHART_COLORS.apify },
] as const;

export type ProviderId = typeof PROVIDERS[number]['id'] | 'all';

interface ProviderSelectorProps {
  selectedProvider?: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  availableProviders?: string[]; // If provided, only show these providers
  loading?: boolean;
  className?: string;
}

export function ProviderSelector({
  selectedProvider = 'all',
  onProviderChange,
  availableProviders,
  loading = false,
  className,
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter to only available providers if specified
  const providers = availableProviders
    ? PROVIDERS.filter(p => availableProviders.includes(p.id))
    : PROVIDERS;

  const selectedLabel = selectedProvider === 'all'
    ? 'All Providers'
    : PROVIDERS.find(p => p.id === selectedProvider)?.label || selectedProvider;

  const selectedColor = selectedProvider === 'all'
    ? undefined
    : getProviderColor(selectedProvider);

  return (
    <Select.Root
      value={selectedProvider}
      onValueChange={(value) => onProviderChange(value as ProviderId)}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Select.Trigger
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-lg px-4 py-2.5',
          'bg-surface-elevated border border-border text-sm font-medium text-text-primary',
          'hover:bg-surface-elevated/80 transition-colors min-w-[160px]',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-text-secondary" />
          {selectedColor && (
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: selectedColor }}
            />
          )}
          <Select.Value placeholder="All Providers">
            {selectedLabel}
          </Select.Value>
        </div>
        <Select.Icon>
          <ChevronDown className={cn(
            'h-4 w-4 text-text-secondary transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={cn(
            'z-50 min-w-[160px] overflow-hidden rounded-xl',
            'bg-surface border border-border shadow-2xl',
            'animate-slide-down'
          )}
          position="popper"
          sideOffset={8}
        >
          <Select.Viewport className="p-1">
            <Select.Item
              value="all"
              className={cn(
                'relative flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg',
                'text-text-primary cursor-pointer outline-none',
                'data-[highlighted]:bg-surface-elevated',
                'data-[state=checked]:text-accent-primary'
              )}
            >
              <Select.ItemIndicator className="absolute left-3">
                <Check className="h-4 w-4" />
              </Select.ItemIndicator>
              <span className="pl-6">All Providers</span>
            </Select.Item>

            {providers.length > 0 && (
              <Select.Separator className="h-px bg-border my-1" />
            )}

            {providers.map(provider => (
              <Select.Item
                key={provider.id}
                value={provider.id}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg',
                  'text-text-primary cursor-pointer outline-none',
                  'data-[highlighted]:bg-surface-elevated',
                  'data-[state=checked]:text-accent-primary'
                )}
              >
                <Select.ItemIndicator className="absolute left-3">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
                <span className="pl-6 flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: provider.color }}
                  />
                  {provider.label}
                </span>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

