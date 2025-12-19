'use client';

import { useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import type { Campaign } from '@/hooks/use-metrics';

interface CampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaign?: string;
  onCampaignChange: (campaign: string | undefined) => void;
  loading?: boolean;
  className?: string;
}

export function CampaignSelector({
  campaigns,
  selectedCampaign,
  onCampaignChange,
  loading = false,
  className,
}: CampaignSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (value: string) => {
    onCampaignChange(value === 'all' ? undefined : value);
  };

  return (
    <Select.Root
      value={selectedCampaign || 'all'}
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Select.Trigger
        className={cn(
          'inline-flex items-center justify-between gap-1.5 rounded-md px-2.5 h-8',
          'bg-surface-elevated border border-border text-xs font-medium text-text-primary',
          'hover:bg-surface-elevated/80 transition-colors min-w-[140px]',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        disabled={loading}
      >
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-text-secondary" />
          <Select.Value placeholder="All Campaigns">
            {selectedCampaign || 'All Campaigns'}
          </Select.Value>
        </div>
        <Select.Icon>
          <ChevronDown className={cn(
            'h-3.5 w-3.5 text-text-secondary transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={cn(
            'z-50 min-w-[180px] overflow-hidden rounded-xl',
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
              <span className="pl-6">All Campaigns</span>
            </Select.Item>

            {campaigns.length > 0 && (
              <Select.Separator className="h-px bg-border my-1" />
            )}

            {campaigns.map(campaign => (
              <Select.Item
                key={campaign.name}
                value={campaign.name}
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
                <span className="pl-6 truncate">{campaign.name}</span>
              </Select.Item>
            ))}

            {campaigns.length === 0 && !loading && (
              <div className="px-3 py-6 text-center text-sm text-text-secondary">
                No campaigns found
              </div>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

