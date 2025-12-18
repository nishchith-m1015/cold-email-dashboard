'use client';

import { useState } from 'react';
import { Check, ChevronDown, Building2, Plus, Shield, Crown, Users, Eye } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { useWorkspace, type Workspace, type WorkspaceRole } from '@/lib/workspace-context';
import { EditableText } from '@/components/ui/editable-text';

interface WorkspaceSwitcherProps {
  className?: string;
  showAddButton?: boolean;
  onAddWorkspace?: () => void;
}

// Role badge colors and icons
const ROLE_CONFIG: Record<WorkspaceRole, { icon: typeof Shield; color: string; label: string }> = {
  owner: { icon: Crown, color: 'text-yellow-500', label: 'Owner' },
  admin: { icon: Shield, color: 'text-blue-500', label: 'Admin' },
  member: { icon: Users, color: 'text-green-500', label: 'Member' },
  viewer: { icon: Eye, color: 'text-gray-500', label: 'Viewer' },
};

function RoleBadge({ role }: { role?: WorkspaceRole }) {
  if (!role) return null;
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;
  
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function WorkspaceSwitcher({
  className,
  showAddButton = false,
  onAddWorkspace,
}: WorkspaceSwitcherProps) {
  const { workspace, workspaces, switchWorkspace, renameWorkspace, isLoading, isSuperAdmin, canManage } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  
  // If only one workspace, just show the name with role (and allow edit)
  if (workspaces.length <= 1 && !showAddButton) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary',
        className
      )}>
        <Building2 className="h-4 w-4 text-text-secondary" />
        <EditableText 
          value={workspace.name}
          onSave={async (name) => {
            if (workspace.id) await renameWorkspace(workspace.id, name);
          }}
          disabled={!canManage}
        />
        {isSuperAdmin && (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
            Admin
          </span>
        )}
      </div>
    );
  }

  const handleValueChange = (workspaceId: string) => {
    if (workspaceId === '__add__') {
      onAddWorkspace?.();
      return;
    }
    switchWorkspace(workspaceId);
  };

  return (
    <div className={cn(
      'inline-flex items-center justify-between gap-1 rounded-lg pr-2',
      'bg-surface-elevated border border-border text-sm font-medium text-text-primary',
      'min-w-[180px] transition-colors hover:bg-surface-elevated/80',
      className
    )}>
      <div className="flex items-center gap-2 pl-3 py-2 flex-1 min-w-0">
        <Building2 className="h-4 w-4 text-text-secondary flex-shrink-0" />
        <EditableText 
          value={workspace.name}
          onSave={async (name) => {
            if (workspace.id) await renameWorkspace(workspace.id, name);
          }}
          disabled={!canManage}
          className="truncate"
        />
      </div>

      <Select.Root
        value={workspace.id}
        onValueChange={handleValueChange}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <Select.Trigger
          className="p-1 hover:bg-black/5 rounded outline-none focus:ring-2 focus:ring-accent-primary"
          aria-label="Select workspace"
          disabled={isLoading}
        >
          <Select.Icon>
            <ChevronDown className={cn(
              'h-4 w-4 text-text-secondary transition-transform flex-shrink-0',
              isOpen && 'rotate-180'
            )} />
          </Select.Icon>
        </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={cn(
            'z-50 min-w-[220px] overflow-hidden rounded-xl',
            'bg-surface border border-border shadow-2xl',
            'animate-slide-down'
          )}
          position="popper"
          sideOffset={8}
        >
          <Select.Viewport className="p-1">
            {isSuperAdmin && (
              <div className="px-3 py-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg mb-1">
                <Shield className="h-3 w-3 inline mr-1" />
                Super Admin - All Workspaces
              </div>
            )}
            
            {workspaces.map(ws => (
              <Select.Item
                key={ws.id}
                value={ws.id}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg',
                  'text-text-primary cursor-pointer outline-none',
                  'data-[highlighted]:bg-surface-elevated',
                  'data-[state=checked]:text-accent-primary'
                )}
              >
                <Select.ItemIndicator className="absolute left-3">
                  <Check className="h-4 w-4" />
                </Select.ItemIndicator>
                <div className="pl-6 flex flex-col gap-0.5 w-full">
                  <span className="font-medium truncate">{ws.name}</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-secondary capitalize">
                      {ws.plan || 'free'} plan
                    </span>
                    <RoleBadge role={ws.role} />
                  </div>
                </div>
              </Select.Item>
            ))}

            {(showAddButton || canManage || isSuperAdmin) && (
              <>
                <Select.Separator className="h-px bg-border my-1" />
                <Select.Item
                  value="__add__"
                  className={cn(
                    'relative flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg',
                    'text-accent-primary cursor-pointer outline-none',
                    'data-[highlighted]:bg-surface-elevated'
                  )}
                >
                  <Plus className="h-4 w-4 ml-6" />
                  <span>Create workspace</span>
                </Select.Item>
              </>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>
  );
}

