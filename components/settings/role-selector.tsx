/**
 * PHASE 34 - PILLAR 2: ROLE SELECTOR DROPDOWN
 * 
 * Dropdown for changing workspace member roles with optimistic updates.
 * Implements Phase 31-style optimistic UI pattern with automatic rollback.
 */

'use client';

import { useState } from 'react';
import { WorkspaceRole } from '@/lib/workspace-access';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Shield, User, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoleSelectorProps {
  workspaceId: string;
  userId: string;
  currentRole: WorkspaceRole;
  disabled?: boolean;
  onRoleChanged?: () => void;
}

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-600' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-600' },
  member: { label: 'Member', icon: User, color: 'text-green-600' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-gray-600' },
};

export function RoleSelector({
  workspaceId,
  userId,
  currentRole,
  disabled,
  onRoleChanged,
}: RoleSelectorProps) {
  const [role, setRole] = useState(currentRole);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleRoleChange = async (newRole: WorkspaceRole) => {
    if (newRole === role) return;

    const prevRole = role;
    setRole(newRole); // Optimistic update
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update role');
      }

      toast({
        title: 'Role updated',
        description: `Successfully changed role to ${ROLE_CONFIG[newRole].label}`,
      });

      onRoleChanged?.();
    } catch (error) {
      setRole(prevRole); // Rollback on error
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Could not update role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const RoleIcon = ROLE_CONFIG[role].icon;

  return (
    <Select
      value={role}
      onValueChange={(value) => handleRoleChange(value as WorkspaceRole)}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RoleIcon className={`h-4 w-4 ${ROLE_CONFIG[role].color}`} />
            )}
            <span>{ROLE_CONFIG[role].label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_CONFIG) as WorkspaceRole[])
          .filter(r => r !== 'owner') // Don't allow promoting to owner via selector
          .map((r) => {
            const Icon = ROLE_CONFIG[r].icon;
            return (
              <SelectItem key={r} value={r}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${ROLE_CONFIG[r].color}`} />
                  <span>{ROLE_CONFIG[r].label}</span>
                </div>
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
}
