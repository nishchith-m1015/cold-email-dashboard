/**
 * PHASE 33 - Template Gallery Component
 * 
 * Displays available workflow templates for campaign creation.
 */

'use client';

import useSWR from 'swr';
import { Mail, Inbox, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: WorkflowTemplate | null) => void;
  selectedTemplateId?: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  inbox: Inbox,
  search: Search,
};

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function TemplateGallery({ onSelectTemplate, selectedTemplateId }: TemplateGalleryProps) {
  const { data, isLoading, error } = useSWR<{ templates: WorkflowTemplate[] }>(
    '/api/templates',
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load templates
      </div>
    );
  }

  const { templates } = data;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Choose a template or start from scratch
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blank Campaign Option */}
        <button
          onClick={() => onSelectTemplate(null)}
          className={cn(
            'p-4 rounded-lg border-2 text-left transition-all hover:border-accent-primary',
            selectedTemplateId === null 
              ? 'border-accent-primary bg-accent-primary/5' 
              : 'border-border'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">Blank Campaign</div>
              <div className="text-sm text-muted-foreground">
                Start from scratch with full customization
              </div>
            </div>
          </div>
        </button>

        {/* Template Cards */}
        {templates.map((template) => {
          const Icon = ICON_MAP[template.icon] || Mail;
          const isSelected = selectedTemplateId === template.id;
          
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className={cn(
                'p-4 rounded-lg border-2 text-left transition-all hover:border-accent-primary',
                isSelected 
                  ? 'border-accent-primary bg-accent-primary/5' 
                  : 'border-border'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {template.description || 'No description'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No templates available yet
        </div>
      )}
    </div>
  );
}
