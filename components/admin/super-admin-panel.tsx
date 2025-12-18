/**
 * PHASE 34.4 - Super Admin Panel Component
 * 
 * Displays all workspaces across the platform for Super Admin users.
 * Allows drilling into individual workspace member management.
 */

'use client';

import useSWR from 'swr';
import { Building2, Users, Calendar, Crown, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  memberCount: number;
  ownerUserId: string | null;
  createdAt: string;
}

interface AllWorkspacesResponse {
  workspaces: WorkspaceSummary[];
  totalCount: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function SuperAdminPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { data, error, isLoading } = useSWR<AllWorkspacesResponse>(
    '/api/admin/all-workspaces',
    fetcher
  );

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
            Platform-wide workspace management
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {totalCount} workspaces
        </Badge>
      </div>

      {/* Workspace List */}
      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className="border border-border rounded-lg overflow-hidden"
          >
            {/* Header Row */}
            <button
              onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">{ws.name}</div>
                  <div className="text-sm text-muted-foreground">/{ws.slug}</div>
                </div>
                <Badge variant="secondary">{ws.plan}</Badge>
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
              <div className="p-4 bg-muted/30 border-t border-border">
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created {new Date(ws.createdAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Workspace ID: <code className="bg-muted px-1 rounded">{ws.id}</code>
                </div>
                {ws.ownerUserId && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Owner ID: <code className="bg-muted px-1 rounded">{ws.ownerUserId}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {workspaces.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No workspaces found
        </div>
      )}
    </div>
  );
}
