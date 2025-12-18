/**
 * Phase 32 Pillar 2: useCampaignPulse Hook
 * Real-Time Synchronization Fabric - Per-Campaign Pulse Indicator
 * 
 * Subscribes to individual campaign changes for live status updates.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { N8nStatus } from '@/lib/dashboard-types';

interface CampaignPulseState {
  status: N8nStatus;
  lastSyncAt: Date | null;
  isSubscribed: boolean;
}

export function useCampaignPulse(campaignId: string) {
  const [pulse, setPulse] = useState<CampaignPulseState>({
    status: 'unknown',
    lastSyncAt: null,
    isSubscribed: false,
  });

  useEffect(() => {
    if (!supabaseBrowser || !campaignId) return;

    const channel = supabaseBrowser
      .channel(`campaign_pulse:${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setPulse({
            status: updated.n8n_status || 'unknown',
            lastSyncAt: updated.last_sync_at ? new Date(updated.last_sync_at) : null,
            isSubscribed: true,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setPulse(prev => ({ ...prev, isSubscribed: true }));
        }
      });

    return () => {
      if (supabaseBrowser) {
        supabaseBrowser.removeChannel(channel);
      }
    };
  }, [campaignId]);

  return pulse;
}
