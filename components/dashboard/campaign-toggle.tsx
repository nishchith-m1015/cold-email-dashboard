/**
 * Campaign Toggle Switch Component
 * 
 * Phase 31 Pillar 4: The Optimistic Interface
 * Toggle switch for activating/deactivating n8n workflows.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CampaignToggleProps {
  campaignId: string;
  isActive: boolean;
  isLinked: boolean;
  isToggling: boolean;
  onToggle: (id: string, action: 'activate' | 'deactivate') => Promise<void>;
  disabled?: boolean;
}

export function CampaignToggle({
  campaignId,
  isActive,
  isLinked,
  isToggling,
  onToggle,
  disabled = false,
}: CampaignToggleProps) {
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || isToggling || !isLinked) return;
    
    setError(null);
    
    try {
      await onToggle(campaignId, isActive ? 'deactivate' : 'activate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  // Not linked to n8n
  if (!isLinked) {
    return (
      <div 
        className="text-xs text-text-secondary italic"
        title="Campaign not linked to n8n workflow"
      >
        Not linked
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || isToggling}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface",
          isActive 
            ? "bg-accent-success" 
            : "bg-surface-elevated",
          (disabled || isToggling) && "opacity-50 cursor-not-allowed"
        )}
        aria-pressed={isActive}
        aria-label={isActive ? 'Deactivate campaign' : 'Activate campaign'}
      >
        <span
          className={cn(
            "inline-flex h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform items-center justify-center",
            isActive ? "translate-x-6" : "translate-x-1"
          )}
        >
          {isToggling && (
            <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />
          )}
        </span>
      </button>
      
      {error && (
        <span className="text-xs text-accent-danger">{error}</span>
      )}
    </div>
  );
}
