'use client';

/**
 * Permission Gate Component
 * 
 * Wraps components to show/hide or disable based on user permissions.
 */

import { ReactNode } from 'react';
import { useWorkspace, WorkspaceRole } from '@/lib/workspace-context';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Permission = 'read' | 'write' | 'manage' | 'admin' | 'owner';

interface PermissionGateProps {
  children: ReactNode;
  /** Required permission level */
  requires: Permission;
  /** Fallback content when permission denied (default: hide) */
  fallback?: ReactNode;
  /** Show disabled state instead of hiding */
  disableInstead?: boolean;
  /** Custom tooltip message for disabled state */
  disabledMessage?: string;
  /** Additional class name for disabled wrapper */
  className?: string;
}

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

// Permission to minimum role mapping
const PERMISSION_REQUIREMENTS: Record<Permission, WorkspaceRole> = {
  read: 'viewer',
  write: 'member',
  manage: 'admin',
  admin: 'admin',
  owner: 'owner',
};

function hasPermission(userRole: WorkspaceRole | null, requiredPermission: Permission): boolean {
  if (!userRole) return false;
  const requiredRole = PERMISSION_REQUIREMENTS[requiredPermission];
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function PermissionGate({
  children,
  requires,
  fallback = null,
  disableInstead = false,
  disabledMessage,
  className,
}: PermissionGateProps) {
  const { userRole, canWrite, canManage } = useWorkspace();
  
  const permitted = hasPermission(userRole, requires);

  // If permitted, render children normally
  if (permitted) {
    return <>{children}</>;
  }

  // If not permitted and no disable mode, render fallback
  if (!disableInstead) {
    return <>{fallback}</>;
  }

  // Disable mode: wrap in tooltip and disable interaction
  const defaultMessage = `Requires ${PERMISSION_REQUIREMENTS[requires]} permissions`;
  const tooltipMessage = disabledMessage || defaultMessage;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'opacity-50 cursor-not-allowed pointer-events-auto',
              className
            )}
            onClick={(e) => e.preventDefault()}
            onKeyDown={(e) => e.preventDefault()}
          >
            <div className="pointer-events-none">
              {children}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook for checking permissions
 */
export function usePermission(permission: Permission): boolean {
  const { userRole } = useWorkspace();
  return hasPermission(userRole, permission);
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: Permission,
  options?: {
    fallback?: ReactNode;
    disableInstead?: boolean;
    disabledMessage?: string;
  }
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate
        requires={permission}
        fallback={options?.fallback}
        disableInstead={options?.disableInstead}
        disabledMessage={options?.disabledMessage}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

// Export types and utilities
export { hasPermission, ROLE_HIERARCHY, PERMISSION_REQUIREMENTS };
export type { Permission };
