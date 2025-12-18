/**
 * PHASE 33 - Provisioning Progress Component
 * 
 * Displays real-time provisioning progress for a new campaign.
 */

'use client';

import useSWR from 'swr';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProvisioningStep {
  step: 'db' | 'n8n_clone' | 'webhook' | 'activate';
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

interface ProvisioningProgressProps {
  campaignId: string;
  onComplete?: () => void;
}

const STEP_LABELS: Record<string, string> = {
  db: 'Creating database record',
  n8n_clone: 'Cloning workflow',
  webhook: 'Linking webhook',
  activate: 'Activating campaign',
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ProvisioningProgress({ campaignId, onComplete }: ProvisioningProgressProps) {
  const { data, error } = useSWR<{
    steps: ProvisioningStep[];
    isComplete: boolean;
    hasError: boolean;
  }>(
    `/api/campaigns/${campaignId}/provision-status`,
    fetcher,
    {
      refreshInterval: 2000, // Poll every 2 seconds
      onSuccess: (data) => {
        if (data.isComplete && onComplete) {
          onComplete();
        }
      },
    }
  );

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load provisioning status
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading status...</span>
      </div>
    );
  }

  const { steps = [], isComplete, hasError } = data;

  // Fallback if no steps returned yet
  if (!steps || steps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {steps.map((step) => {
          const label = STEP_LABELS[step.step] || step.step;
          
          return (
            <div key={step.step} className="flex items-center gap-3">
              {/* Status Icon */}
              {step.status === 'done' && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {step.status === 'running' && (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              )}
              {step.status === 'pending' && (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              {step.status === 'error' && (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              
              {/* Label */}
              <span
                className={cn(
                  'text-sm',
                  step.status === 'done' && 'text-foreground',
                  step.status === 'running' && 'text-blue-500',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'error' && 'text-destructive'
                )}
              >
                {label}
              </span>
              
              {/* Error message */}
              {step.error && (
                <span className="text-xs text-destructive">
                  ({step.error})
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      {isComplete && (
        <div className="text-green-500 text-sm font-medium">
          ✓ Campaign provisioned successfully!
        </div>
      )}
      
      {hasError && (
        <div className="text-destructive text-sm">
          Provisioning encountered an error. You can retry later.
        </div>
      )}
    </div>
  );
}
