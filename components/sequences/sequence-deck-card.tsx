'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sanitizeHtml, hasMissingNameVariable } from '@/lib/html-sanitizer';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface SequenceDeckCardProps {
  stepNumber: 1 | 2 | 3;
  subject: string | null;
  body: string | null;
  sent: boolean | null;
  className?: string;
}

/**
 * SequenceDeckCard - Displays a single email draft in the sequence
 * 
 * Features:
 * - Status badge (Sent/Queued)
 * - Subject line display
 * - Sanitized HTML body rendering
 * - Missing name variable detection
 */
export function SequenceDeckCard({
  stepNumber,
  subject,
  body,
  sent,
  className,
}: SequenceDeckCardProps) {
  const hasMissingName = body ? hasMissingNameVariable(body) : false;
  const sanitizedBody = sanitizeHtml(body);

  return (
    <Card className={cn('p-6 space-y-4', className)}>
      {/* Header: Step number + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-primary/10 text-accent-primary font-semibold text-sm">
            {stepNumber}
          </div>
          <h3 className="font-semibold text-text-primary">
            Email {stepNumber}
          </h3>
        </div>

        {/* Status Badge */}
        {sent ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </Badge>
        ) : (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Queued
          </Badge>
        )}
      </div>

      {/* Subject Line */}
      <div>
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">
          Subject
        </p>
        {subject ? (
          <p className="font-medium text-text-primary">{subject}</p>
        ) : (
          <p className="text-text-tertiary italic">No subject line</p>
        )}
      </div>

      {/* Missing Name Warning */}
      {hasMissingName && (
        <div className="flex items-start gap-2 p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-md">
          <AlertTriangle className="w-4 h-4 text-accent-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-accent-danger">
            <span className="font-semibold">Missing Name Variable</span>
            <p className="text-xs mt-1">
              Body contains &quot;Hey ,&quot; — first name variable may be missing. Expected example: &quot;Hey {'{{first_name}}'}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Email Body */}
      <div>
        <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">
          Body
        </p>
        {sanitizedBody ? (
          <div
            className="prose prose-sm max-w-none text-text-primary
              prose-p:my-2 prose-p:leading-relaxed
              prose-a:text-accent-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-text-primary prose-strong:font-semibold
              prose-ul:my-2 prose-li:my-1
              bg-surface-elevated p-4 rounded-md border border-border-primary"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        ) : (
          <div className="bg-surface-elevated p-4 rounded-md border border-border-primary">
            <p className="text-text-tertiary italic text-sm">
              No body content available
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
