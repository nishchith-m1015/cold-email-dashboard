'use client';

import { useSenderStats } from '@/hooks';
import { cn } from '@/lib/utils';

interface SenderBreakdownProps {
  startDate: string;
  endDate: string;
  campaign?: string;
  className?: string;
}

export function SenderBreakdown({
  startDate,
  endDate,
  campaign,
  className,
}: SenderBreakdownProps) {
  const { senders, totalSenders, isLoading } = useSenderStats(startDate, endDate, campaign);

  if (isLoading) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-6', className)}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Per-Sender Breakdown</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-surface-elevated rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (senders.length === 0) {
    return (
      <div className={cn('bg-surface rounded-xl border border-border p-6', className)}>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Per-Sender Breakdown</h3>
        <p className="text-text-secondary text-sm">No sender data available yet.</p>
        <p className="text-text-muted text-xs mt-2">
          Add <code className="bg-surface-elevated px-1 rounded">sender_email</code> to your event metadata to track per-sender metrics.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-surface rounded-xl border border-border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Per-Sender Breakdown</h3>
        <span className="text-xs text-text-muted bg-surface-elevated px-2 py-1 rounded">
          {totalSenders} sender{totalSenders !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-text-secondary font-medium">Sender</th>
              <th className="text-right py-2 px-2 text-text-secondary font-medium">Sends</th>
              <th className="text-right py-2 px-2 text-text-secondary font-medium">Replies</th>
              <th className="text-right py-2 px-2 text-text-secondary font-medium">Reply %</th>
              <th className="text-right py-2 px-2 text-text-secondary font-medium">Opens</th>
              <th className="text-right py-2 px-2 text-text-secondary font-medium">Clicks</th>
              <th className="text-right py-2 px-2 text-text-secondary font-medium">Opt-outs</th>
            </tr>
          </thead>
          <tbody>
            {senders.map((sender, idx) => (
              <tr 
                key={sender.sender_email}
                className={cn(
                  'border-b border-border/50 hover:bg-surface-elevated/50 transition-colors',
                  idx === senders.length - 1 && 'border-b-0'
                )}
              >
                <td className="py-3 px-2">
                  <span className="text-text-primary font-medium truncate max-w-[200px] block">
                    {sender.sender_email}
                  </span>
                </td>
                <td className="text-right py-3 px-2 text-text-primary">{sender.sends}</td>
                <td className="text-right py-3 px-2 text-accent-success">{sender.replies}</td>
                <td className="text-right py-3 px-2">
                  {/* Always green to match Replies column */}
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-success/20 text-accent-success">
                    {sender.reply_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right py-3 px-2 text-text-secondary">{sender.opens}</td>
                <td className="text-right py-3 px-2 text-text-secondary">{sender.clicks}</td>
                <td className="text-right py-3 px-2">
                  {/* Always red to match Opt-outs concept */}
                  <span className="text-xs text-accent-danger">
                    {sender.opt_outs} ({sender.opt_out_rate.toFixed(1)}%)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

