/**
 * CampaignManagementCardStack - Mobile card view for campaign management
 * 
 * Phase 38: Mobile Sovereignty - Pillar 1: The Card Metamorphosis
 * 
 * Replaces the CampaignManagementTable on mobile with tappable cards
 * featuring swipe-like actions via overflow menu.
 * 
 * Features:
 * - Vertical card stack layout
 * - Campaign name + status visible at glance
 * - Toggle switch for active/paused
 * - Overflow menu (•••) for actions instead of context menu
 * - N8n sync status indicators
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  RefreshCw, 
  AlertCircle, 
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCampaigns } from '@/hooks/use-campaigns';
import { CampaignToggle } from './campaign-toggle';
import { usePermission } from '@/components/ui/permission-gate';
import type { Campaign } from '@/lib/dashboard-types';

interface CampaignManagementCardStackProps {
  workspaceId?: string;
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

function CampaignCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
    </Card>
  );
}

// Status badge component
function StatusBadge({ status }: { status?: Campaign['status'] }) {
  const styles = {
    active: 'bg-accent-success/10 text-accent-success border-accent-success/20',
    paused: 'bg-accent-warning/10 text-accent-warning border-accent-warning/20',
    completed: 'bg-text-secondary/10 text-text-secondary border-border',
  };

  const labels = {
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
  };

  return (
    <Badge variant="secondary" className={cn('text-xs', styles[status || 'paused'])}>
      {labels[status || 'paused']}
    </Badge>
  );
}

// N8n sync indicator
function N8nIndicator({ status }: { status?: Campaign['n8n_status'] }) {
  if (!status || status === 'unknown') return null;

  const config = {
    active: { icon: CheckCircle2, color: 'text-accent-success', label: 'n8n Active' },
    inactive: { icon: XCircle, color: 'text-text-secondary', label: 'n8n Inactive' },
    error: { icon: AlertCircle, color: 'text-accent-danger', label: 'n8n Error' },
    unknown: { icon: null, color: '', label: '' },
  };

  const cfg = config[status];
  if (!cfg.icon) return null;
  const Icon = cfg.icon;

  return (
    <span className={cn('flex items-center gap-1 text-xs', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function CampaignManagementCardStack({
  workspaceId,
  className,
}: CampaignManagementCardStackProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    campaigns,
    isLoading,
    error,
    toggleCampaign,
    updateCampaign,
    isToggling,
    refresh,
  } = useCampaigns({ workspaceId });

  const canWrite = usePermission('write');
  const canManage = usePermission('manage');

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Handle toggle
  const handleToggle = async (id: string, action: 'activate' | 'deactivate') => {
    await toggleCampaign(id, action);
  };

  // Handle rename
  const handleRename = async (id: string, newName: string) => {
    await updateCampaign(id, { name: newName });
    setEditingId(null);
  };

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-accent-danger" />
          <p className="text-text-secondary text-sm">Failed to load campaigns</p>
          <Button size="sm" variant="secondary" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Search campaigns..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={refresh}
          className="h-10 w-10"
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCampaigns.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-text-secondary text-sm">
            {searchFilter ? 'No campaigns match your search' : 'No campaigns yet'}
          </p>
        </Card>
      )}

      {/* Campaign Cards */}
      {!isLoading && filteredCampaigns.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredCampaigns.map((campaign) => (
            <motion.div key={campaign.id} variants={cardVariants}>
              <Card className="active:scale-[0.98] transition-transform">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Campaign Info */}
                    <div className="flex-1 min-w-0">
                      {/* Campaign Name */}
                      {editingId === campaign.id ? (
                        <Input
                          defaultValue={campaign.name}
                          autoFocus
                          className="h-8 text-sm font-medium"
                          onBlur={(e) => handleRename(campaign.id!, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRename(campaign.id!, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                        />
                      ) : (
                        <h3 className="font-medium text-text-primary truncate">
                          {campaign.name}
                        </h3>
                      )}

                      {/* Status Row */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={campaign.status} />
                        <N8nIndicator status={campaign.n8n_status} />
                      </div>
                    </div>

                    {/* Right: Toggle + Menu */}
                    <div className="flex items-center gap-2">
                      {/* Toggle Switch */}
                      <CampaignToggle
                        campaignId={campaign.id!}
                        isActive={campaign.status === 'active'}
                        isLinked={Boolean(campaign.n8n_workflow_id)}
                        onToggle={handleToggle}
                        isToggling={typeof isToggling === 'string' ? isToggling === campaign.id : false}
                        disabled={!canWrite}
                      />

                      {/* Overflow Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            disabled={!canWrite}
                            onClick={() => setEditingId(campaign.id!)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>

                          {campaign.status === 'active' ? (
                            <DropdownMenuItem
                              disabled={!canWrite || (typeof isToggling === 'string' && isToggling === campaign.id)}
                              onClick={() => handleToggle(campaign.id!, 'deactivate')}
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Campaign
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={!canWrite || (typeof isToggling === 'string' && isToggling === campaign.id)}
                              onClick={() => handleToggle(campaign.id!, 'activate')}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Resume Campaign
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            disabled={!canManage}
                            className="text-accent-danger focus:text-accent-danger"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
