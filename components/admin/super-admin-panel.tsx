/**
 * PHASE 36.2 - Super Admin Panel Component (Enhanced)
 * 
 * Displays all workspaces across the platform for Super Admin users.
 * Includes Kill Switch (freeze/unfreeze) functionality.
 */

'use client';

import useSWR from 'swr';
import { 
  Building2, 
  Users, 
  Calendar, 
  Crown, 
  ChevronDown,
  AlertTriangle,
  Unlock,
  Loader2,
  Snowflake
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
  ownerUserId: string | null;
  createdAt: string;
  status?: 'active' | 'suspended' | 'frozen';
  frozenAt?: string;
  freezeReason?: string;
}

interface AllWorkspacesResponse {
  workspaces: WorkspaceSummary[];
  totalCount: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function SuperAdminPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data, error, isLoading, mutate } = useSWR<AllWorkspacesResponse>(
    '/api/admin/all-workspaces',
    fetcher
  );

  const handleFreeze = async (workspaceId: string, workspaceName: string) => {
    const reason = prompt(`Enter reason for freezing "${workspaceName}":`);
    if (reason === null) return; // User cancelled

    setFreezingId(workspaceId);
    
    try {
      const response = await fetch('/api/admin/freeze-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          reason: reason || 'No reason provided',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to freeze workspace',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Workspace Frozen',
          description: `"${workspaceName}" has been frozen. All API access is blocked.`,
        });
        mutate(); // Refresh the list
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setFreezingId(null);
    }
  };

  const handleUnfreeze = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to unfreeze "${workspaceName}"?`)) return;

    setFreezingId(workspaceId);
    
    try {
      const response = await fetch(`/api/admin/freeze-workspace?workspace_id=${workspaceId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to unfreeze workspace',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Workspace Unfrozen',
          description: `"${workspaceName}" has been restored to active status.`,
        });
        mutate(); // Refresh the list
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive',
      });
    } finally {
      setFreezingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading workspaces...</div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-destructive">
        Failed to load workspaces. You may not have Super Admin access.
      </div>
    );
  }

  const { workspaces, totalCount } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Super Admin Panel
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide workspace management with Kill Switch
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {totalCount} workspaces
        </Badge>
      </div>

      {/* Workspace List */}
      <div className="space-y-3">
        {workspaces.map((ws) => {
          const isFrozen = ws.status === 'frozen';
          const isProcessing = freezingId === ws.id;

          return (
            <div
              key={ws.id}
              className={cn(
                "border rounded-lg overflow-hidden",
                isFrozen ? "border-red-500/50 bg-red-500/5" : "border-border"
              )}
            >
              {/* Header Row */}
              <button
                onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Building2 className={cn(
                    "h-5 w-5",
                    isFrozen ? "text-red-500" : "text-muted-foreground"
                  )} />
                  <div className="text-left">
                    <div className="font-semibold flex items-center gap-2">
                      {ws.name}
                      {isFrozen && (
                        <Snowflake className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">/{ws.slug}</div>
                  </div>
                  
                  {/* Status Badge */}
                  {isFrozen ? (
                    <Badge variant="danger" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Frozen
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{ws.plan}</Badge>
                  )}
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {ws.memberCount}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform',
                    expandedId === ws.id && 'rotate-180'
                  )}
                />
              </button>

              {/* Expanded Content */}
              {expandedId === ws.id && (
                <div className="p-4 bg-muted/30 border-t border-border space-y-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created {new Date(ws.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Workspace ID: <code className="bg-muted px-1 rounded">{ws.id}</code>
                  </div>
                  {ws.ownerUserId && (
                    <div className="text-sm text-muted-foreground">
                      Owner ID: <code className="bg-muted px-1 rounded">{ws.ownerUserId}</code>
                    </div>
                  )}

                  {/* Freeze Reason if frozen */}
                  {isFrozen && ws.freezeReason && (
                    <div className="text-sm text-red-400 bg-red-500/10 rounded-md p-2">
                      <strong>Freeze Reason:</strong> {ws.freezeReason}
                    </div>
                  )}

                  {/* Kill Switch Section */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <span className="text-sm font-medium">Kill Switch</span>
                      <p className="text-xs text-muted-foreground">
                        {isFrozen ? 'Workspace is frozen - all API access blocked' : 'Freeze to block all API access'}
                      </p>
                    </div>
                    
                    {isFrozen ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfreeze(ws.id, ws.name);
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                        Unfreeze
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFreeze(ws.id, ws.name);
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        Freeze Tenant
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {workspaces.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No workspaces found
        </div>
      )}
    </div>
  );
}
