/**
 * PHASE 36.2 - Audit Log Viewer Component
 * 
 * Displays real-time audit logs for Super Admins.
 * Aggregates governance, role, and vault audit events.
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { 
  Shield, 
  UserCog, 
  Key, 
  RefreshCw, 
  Calendar,
  Filter,
  ChevronDown,
  AlertTriangle,
  Unlock,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  source: 'governance' | 'role' | 'vault';
  action: string;
  actor_id: string;
  actor_email?: string;
  workspace_id?: string;
  workspace_name?: string;
  target_user_id?: string;
  details?: string;
  created_at: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  count: number;
  hasMore: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const SOURCE_CONFIG = {
  governance: { icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Governance' },
  role: { icon: UserCog, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Role' },
  vault: { icon: Key, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Vault' },
};

const ACTION_ICONS: Record<string, typeof Shield> = {
  freeze: AlertTriangle,
  unfreeze: Unlock,
  role_change: UserCog,
  vault_insert: Key,
  vault_update: Key,
  vault_delete: Key,
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    freeze: 'Workspace Frozen',
    unfreeze: 'Workspace Unfrozen',
    role_change: 'Role Changed',
    vault_insert: 'Key Added',
    vault_update: 'Key Updated',
    vault_delete: 'Key Deleted',
    suspend: 'Workspace Suspended',
    activate: 'Workspace Activated',
  };
  return labels[action] || action;
}

export function AuditLogViewer() {
  const [filter, setFilter] = useState<'all' | 'governance' | 'role' | 'vault'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sourceParam = filter === 'all' ? '' : `&source=${filter}`;
  const { data, error, isLoading, mutate } = useSWR<AuditResponse>(
    `/api/admin/unified-audit?limit=50${sourceParam}`,
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30s
      revalidateOnFocus: true,
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load audit logs. Make sure you have Super Admin access.
      </div>
    );
  }

  const entries = data?.entries || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Platform Audit Log</h3>
          <Badge variant="secondary" className="text-xs">
            {entries.length} events
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                const sources: Array<'all' | 'governance' | 'role' | 'vault'> = ['all', 'governance', 'role', 'vault'];
                const currentIndex = sources.indexOf(filter);
                const nextIndex = (currentIndex + 1) % sources.length;
                setFilter(sources[nextIndex]);
              }}
            >
              <Filter className="h-3.5 w-3.5" />
              {filter === 'all' ? 'All' : SOURCE_CONFIG[filter].label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Log Entries */}
      <div className="border border-border rounded-lg divide-y divide-border max-h-[500px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No audit events found
          </div>
        ) : (
          entries.map((entry) => {
            const sourceConfig = SOURCE_CONFIG[entry.source];
            const SourceIcon = sourceConfig.icon;
            const ActionIcon = ACTION_ICONS[entry.action] || sourceConfig.icon;

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                {/* Source Icon */}
                <div className={cn("p-2 rounded-lg", sourceConfig.bg)}>
                  <SourceIcon className={cn("h-4 w-4", sourceConfig.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {getActionLabel(entry.action)}
                    </span>
                    {entry.workspace_name && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.workspace_name}
                      </Badge>
                    )}
                  </div>
                  
                  {entry.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {entry.details}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {entry.actor_email || entry.actor_id.slice(0, 12) + '...'}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTimeAgo(entry.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Auto-refresh indicator */}
      <p className="text-xs text-muted-foreground text-center">
        Auto-refreshes every 30 seconds
      </p>
    </div>
  );
}
