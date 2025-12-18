/**
 * PHASE 33 - Campaign Creation Wizard
 * 
 * Multi-step wizard for creating new campaigns.
 * Steps: Template Selection → Basic Info → Confirmation
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateGallery } from './template-gallery';
import { ProvisioningProgress } from './provisioning-progress';
import { useWorkspace } from '@/lib/workspace-context';
import { ChevronLeft, ChevronRight, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
}

type WizardStep = 'template' | 'info' | 'provisioning';

interface CampaignWizardProps {
  onClose?: () => void;
}

export function CampaignWizard({ onClose }: CampaignWizardProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  
  const [step, setStep] = useState<WizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  const handleSelectTemplate = (template: WorkflowTemplate | null) => {
    setSelectedTemplate(template);
  };

  const handleNext = () => {
    if (step === 'template') {
      setStep('info');
    }
  };

  const handleBack = () => {
    if (step === 'info') {
      setStep('template');
    }
  };

  const handleCreate = async () => {
    if (!workspace?.id || !campaignName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          description: campaignDescription.trim() || undefined,
          templateId: selectedTemplate?.id || undefined,
          workspaceId: workspace.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      setCreatedCampaignId(data.campaignId);
      setStep('provisioning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsCreating(false);
    }
  };

  const handleProvisioningComplete = () => {
    // Navigate to the new campaign or close wizard
    if (onClose) {
      onClose();
    }
    router.refresh();
  };

  // Step indicator
  const steps = ['Template', 'Details', 'Creating'];
  const currentStepIndex = step === 'template' ? 0 : step === 'info' ? 1 : 2;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                index <= currentStepIndex
                  ? 'bg-accent-primary text-white'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                'ml-2 text-sm',
                index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <ChevronRight className="mx-3 h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {/* Step 1: Template Selection */}
        {step === 'template' && (
          <TemplateGallery
            onSelectTemplate={handleSelectTemplate}
            selectedTemplateId={selectedTemplate?.id ?? null}
          />
        )}

        {/* Step 2: Basic Info */}
        {step === 'info' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Q1 Outreach - Healthcare"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Description
              </label>
              <textarea
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
                placeholder="Describe the purpose of this campaign..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              />
            </div>

            {selectedTemplate && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Template
                </div>
                <div className="font-medium">{selectedTemplate.name}</div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Provisioning */}
        {step === 'provisioning' && createdCampaignId && (
          <div className="space-y-4">
            <div className="text-center">
              <Rocket className="h-12 w-12 mx-auto text-accent-primary mb-4" />
              <h3 className="text-lg font-semibold">Setting up your campaign</h3>
              <p className="text-sm text-muted-foreground">
                This will only take a moment...
              </p>
            </div>
            
            <ProvisioningProgress
              campaignId={createdCampaignId}
              onComplete={handleProvisioningComplete}
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {step !== 'provisioning' && (
        <div className="flex justify-between pt-4 border-t border-border">
          <button
            onClick={step === 'template' ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 'template' ? 'Cancel' : 'Back'}
          </button>

          {step === 'template' && (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {step === 'info' && (
            <button
              onClick={handleCreate}
              disabled={!campaignName.trim() || isCreating}
              className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Create Campaign
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
