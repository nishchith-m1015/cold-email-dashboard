/**
 * Phase 32 Pillar 2: Campaign Pulse Component
 * Real-Time Synchronization Fabric - Per-Campaign Pulse Indicator
 * 
 * Displays a live pulse indicator for individual campaigns.
 */

'use client';

import { useCampaignPulse } from '@/lib/hooks/use-campaign-pulse';
import { cn } from '@/lib/utils';
import type { N8nStatus } from '@/lib/dashboard-types';

interface CampaignPulseProps {
  campaignId: string;
  className?: string;
}

const PULSE_COLORS: Record<N8nStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  unknown: 'bg-gray-300',
  error: 'bg-red-500',
};

const PULSE_LABELS: Record<N8nStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  unknown: 'Unknown',
  error: 'Error',
};

export function CampaignPulse({ campaignId, className }: CampaignPulseProps) {
  const pulse = useCampaignPulse(campaignId);

  return (
    <div 
      className={cn('relative flex items-center gap-1.5', className)} 
      title={`Status: ${PULSE_LABELS[pulse.status]}${pulse.lastSyncAt ? ` (Last sync: ${pulse.lastSyncAt.toLocaleTimeString()})` : ''}`}
    >
      <div className="relative flex items-center">
        <div 
          className={cn(
            'h-2 w-2 rounded-full transition-colors',
            PULSE_COLORS[pulse.status],
            pulse.status === 'active' && 'animate-pulse'
          )} 
        />
        
        {pulse.status === 'active' && (
          <div 
            className={cn(
              'absolute h-2 w-2 rounded-full animate-ping',
              PULSE_COLORS.active,
              'opacity-75'
            )} 
          />
        )}
      </div>

      {!pulse.isSubscribed && (
        <span className="text-xs text-text-secondary" title="Not connected to real-time updates">
          ?
        </span>
      )}
    </div>
  );
}
