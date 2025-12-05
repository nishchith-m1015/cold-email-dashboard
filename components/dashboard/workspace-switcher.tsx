'use client';

import { useState } from 'react';
import { Check, ChevronDown, Building2, Plus } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { useWorkspace, type Workspace } from '@/lib/workspace-context';

interface WorkspaceSwitcherProps {
  className?: string;
  showAddButton?: boolean;
  onAddWorkspace?: () => void;
}

export function WorkspaceSwitcher({
  className,
  showAddButton = false,
  onAddWorkspace,
}: WorkspaceSwitcherProps) {
  const { workspace, workspaces, setWorkspace, isLoading } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  // If only one workspace, don't show the switcher
  if (workspaces.length <= 1 && !showAddButton) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary',
        className
      )}>
        <Building2 className="h-4 w-4 text-text-secondary" />
        <span className="truncate max-w-[150px]">{workspace.name}</span>
      </div>
    );
  }

  const handleValueChange = (workspaceId: string) => {
    if (workspaceId === '__add__') {
      onAddWorkspace?.();
      return;
    }
    
    const selected = workspaces.find(w => w.id === workspaceId);
    if (selected) {
      setWorkspace(selected);
    }
  };

  return (
    <Select.Root
      value={workspace.id}
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Select.Trigger
        className={cn(
          'inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2',
          'bg-surface-elevated border border-border text-sm font-medium text-text-primary',
          'hover:bg-surface-elevated/80 transition-colors min-w-[180px]',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        disabled={isLoading}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-text-secondary flex-shrink-0" />
          <Select.Value placeholder="Select workspace">
            <span className="truncate max-w-[120px]">{workspace.name}</span>
          </Select.Value>
        </div>
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
            'z-50 min-w-[200px] overflow-hidden rounded-xl',
            'bg-surface border border-border shadow-2xl',
            'animate-slide-down'
          )}
          position="popper"
          sideOffset={8}
        >
          <Select.Viewport className="p-1">
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
                <div className="pl-6 flex flex-col">
                  <span className="font-medium truncate">{ws.name}</span>
                  {ws.plan && (
                    <span className="text-xs text-text-secondary capitalize">
                      {ws.plan} plan
                    </span>
                  )}
                </div>
              </Select.Item>
            ))}

            {showAddButton && (
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
                  <span>Add workspace</span>
                </Select.Item>
              </>
            )}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

