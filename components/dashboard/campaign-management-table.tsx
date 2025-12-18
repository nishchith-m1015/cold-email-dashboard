/**
 * Campaign Management Table
 * 
 * Phase 31 Pillar 4: The Optimistic Interface
 * Table for managing campaigns with toggle functionality.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, RefreshCw, AlertCircle, Pencil, Pause, Play, Trash2, BarChart3 } from 'lucide-react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { CampaignToggle } from './campaign-toggle';
import { CampaignPulse } from './campaign-pulse';
import { SyncLegend } from '@/components/ui/sync-legend';
import { EditableText } from '@/components/ui/editable-text';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { usePermission } from '@/components/ui/permission-gate';
import { useSelection } from '@/hooks/use-selection';
import { BulkActionToolbar, BulkAction } from '@/components/ui/bulk-action-toolbar';
import { Checkbox } from '@/components/ui/checkbox';

interface CampaignManagementTableProps {
  workspaceId?: string;
  className?: string;
}

export function CampaignManagementTable({ 
  workspaceId, 
  className 
}: CampaignManagementTableProps) {
  const [searchFilter, setSearchFilter] = useState('');
  
  const { 
    campaigns, 
    isLoading, 
    error, 
    toggleCampaign, 
    updateCampaign,
    isToggling, 
    refresh 
  } = useCampaigns({ workspaceId });

  // Permission checks
  const canWrite = usePermission('write');
  const canManage = usePermission('manage');

  // Filter campaigns by search
  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Selection state
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isIndeterminate,
  } = useSelection(filteredCampaigns);

  // Handle toggle with toast feedback
  const handleToggle = async (id: string, action: 'activate' | 'deactivate') => {
    const result = await toggleCampaign(id, action);
    
    if (!result.success) {
      // In a real app, show a toast here
      console.error('Toggle failed:', result.error);
    }
  };

  // Bulk action handlers
  const handleBulkPause = async () => {
    if (!confirm(`Pause ${selectedCount} campaign(s)?`)) return;
    
    await Promise.all(
      selectedIds.map(id => toggleCampaign(id, 'deactivate'))
    );
    clearSelection();
    refresh();
  };

  const handleBulkResume = async () => {
    if (!confirm(`Resume ${selectedCount} campaign(s)?`)) return;
    
    await Promise.all(
      selectedIds.map(id => toggleCampaign(id, 'activate'))
    );
    clearSelection();
    refresh();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedCount} campaign(s)? This action cannot be undone.`)) return;
    
    // TODO: Implement bulk delete API endpoint
    console.log('Bulk delete:', selectedIds);
    clearSelection();
  };

  //Bulk actions configuration
  const bulkActions: BulkAction[] = [
    {
      id: 'pause',
      label: 'Pause',
      icon: Pause,
      onClick: handleBulkPause,
      requiresPermission: 'write',
    },
    {
      id: 'resume',
      label: 'Resume',
      icon: Play,
      onClick: handleBulkResume,
      requiresPermission: 'write',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: handleBulkDelete,
      variant: 'danger' as const,
      requiresPermission: 'manage',
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-text-secondary">
            <AlertCircle className="h-8 w-8 text-accent-danger" />
            <p>Failed to load campaigns</p>
            <button 
              onClick={refresh}
              className="text-accent-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Campaign Management</CardTitle>
              <button 
                onClick={refresh}
                className="p-1 hover:bg-surface-elevated rounded transition-colors"
                title="Refresh campaigns"
              >
                <RefreshCw className="h-4 w-4 text-text-secondary" />
              </button>
              <SyncLegend />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Search campaigns..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    n8n Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Live
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Toggle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-text-secondary"
                    >
                      {searchFilter ? 'No matching campaigns' : 'No campaigns found'}
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign, index) => (
                    <ContextMenu key={campaign.id}>
                      <ContextMenuTrigger asChild>
                        <motion.tr
                          className="hover:bg-surface-elevated/50 transition-colors cursor-context-menu"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          <td className="px-6 py-4 w-12">
                            <Checkbox
                              checked={isSelected(campaign.id)}
                              onCheckedChange={() => toggleSelection(campaign.id)}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-text-primary">
                              <EditableText
                                value={campaign.name}
                                onSave={async (val) => {
                                  await updateCampaign(campaign.id, { name: val });
                                }}
                              />
                            </div>
                            {campaign.description && (
                              <div className="text-xs text-text-secondary mt-1">
                                {campaign.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Badge 
                              variant={
                                campaign.status === 'active' ? 'success' : 
                                campaign.status === 'paused' ? 'warning' : 
                                'default'
                              }
                            >
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Badge 
                              variant={
                                campaign.n8n_status === 'active' ? 'success' : 
                                campaign.n8n_status === 'error' ? 'danger' : 
                                'default'
                              }
                            >
                              {campaign.n8n_status || 'unknown'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <CampaignPulse campaignId={campaign.id!} />
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <CampaignToggle
                              campaignId={campaign.id}
                              isActive={campaign.n8n_status === 'active'}
                              isLinked={Boolean(campaign.n8n_workflow_id)}
                              isToggling={isToggling(campaign.id)}
                              onToggle={handleToggle}
                            />
                          </td>
                        </motion.tr>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => {
                            // Trigger edit mode on the EditableText
                            const row = document.querySelector(`[data-campaign-id="${campaign.id}"]`);
                            row?.querySelector('button')?.click();
                          }}
                          disabled={!canWrite}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                          <ContextMenuShortcut>F2</ContextMenuShortcut>
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => window.open(`/campaigns/${campaign.id}`, '_blank')}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Analytics
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleToggle(
                            campaign.id,
                            campaign.n8n_status === 'active' ? 'deactivate' : 'activate'
                          )}
                          disabled={!canWrite || !campaign.n8n_workflow_id || isToggling(campaign.id)}
                        >
                          {campaign.n8n_status === 'active' ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause Campaign
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Resume Campaign
                            </>
                          )}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {canManage && (
                          <ContextMenuItem
                            destructive
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
                                // TODO: Implement delete functionality
                                console.log('Delete campaign:', campaign.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Campaign
                            <ContextMenuShortcut>⌫</ContextMenuShortcut>
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        actions={bulkActions}
      />
    </motion.div>
  );
}
