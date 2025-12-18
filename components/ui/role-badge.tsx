'use client';

/**
 * Role Badge Component
 * 
 * Visual indicator for user roles in the workspace.
 */

import { Crown, Shield, Users, Eye, LucideIcon } from 'lucide-react';
import { WorkspaceRole } from '@/lib/workspace-context';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: WorkspaceRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface RoleConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const ROLE_CONFIG: Record<WorkspaceRole, RoleConfig> = {
  owner: {
    icon: Crown,
    label: 'Owner',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  member: {
    icon: Users,
    label: 'Member',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  viewer: {
    icon: Eye,
    label: 'Viewer',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'h-3 w-3',
  },
  md: {
    container: 'px-2 py-1 text-xs gap-1.5',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm gap-2',
    icon: 'h-4 w-4',
  },
};

export function RoleBadge({
  role,
  size = 'md',
  showLabel = true,
  className,
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  const sizeConfig = SIZE_CLASSES[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.color,
        config.bgColor,
        config.borderColor,
        sizeConfig.container,
        className
      )}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Role indicator for current user
 */
export function CurrentUserRole({ className }: { className?: string }) {
  // This would typically use useWorkspace but we'll keep it simple
  return null; // Placeholder - integrate with workspace context
}

export { ROLE_CONFIG };
