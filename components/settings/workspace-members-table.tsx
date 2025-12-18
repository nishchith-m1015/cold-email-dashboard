/**
 * PHASE 34 - PILLAR 1: WORKSPACE MEMBERS TABLE
 * 
 * Displays all workspace members with role selectors for management.
 * Uses Clerk user data for avatars, names, and emails.
 */

'use client';

import useSWR from 'swr';
import { useWorkspace } from '@/lib/workspace-context';
import { WorkspaceRole } from '@/lib/workspace-access';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Crown, User, Eye, Loader2, AlertTriangle } from 'lucide-react';
import { RoleSelector } from './role-selector';

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const ROLE_COLORS = {
  owner: 'text-amber-600',
  admin: 'text-blue-600',
  member: 'text-green-600',
  viewer: 'text-gray-600',
};

interface WorkspaceMember {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: WorkspaceRole;
  isCurrentUser: boolean;
  isOrphan?: boolean;
}

interface MembersResponse {
  members: WorkspaceMember[];
  totalCount: number;
  currentUserRole: WorkspaceRole;
  canManage: boolean;
}

export function WorkspaceMembersTable({ debugMode = false }: { debugMode?: boolean }) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    workspaceId ? `/api/workspaces/${workspaceId}/members` : null
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading members...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load workspace members. Please try again.
      </div>
    );
  }

  const { members, currentUserRole, canManage } = data;
  
  // Debug mode override
  const showActions = canManage || debugMode;

  if (members.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No members found in this workspace.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role];
            const roleColor = ROLE_COLORS[member.role];
            
            return (
              <TableRow 
                key={member.userId}
                className="group transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.imageUrl || undefined} alt={member.name || member.email} />
                      <AvatarFallback className="text-xs">
                        {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className={cn("font-medium text-sm", member.isOrphan && "text-amber-600 dark:text-amber-500 flex items-center gap-1.5")}>
                        {member.isOrphan && <AlertTriangle className="h-3.5 w-3.5" />}
                        {member.name || 'Unnamed User'}
                      </div>
                      {member.isCurrentUser && (
                        <Badge variant="secondary" className="text-xs w-fit mt-0.5">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cn("text-sm text-muted-foreground", member.isOrphan && "font-mono text-xs opacity-70")}>
                  {member.email}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <RoleIcon className={`h-4 w-4 ${roleColor}`} />
                    <span className={`text-sm font-medium ${roleColor}`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {showActions && (!member.isCurrentUser || debugMode) && member.role !== 'owner' ? (
                    <RoleSelector
                      workspaceId={workspaceId!}
                      userId={member.userId}
                      currentRole={member.role}
                      onRoleChanged={() => mutate()}
                      disabled={!canManage} // Visual only in debug mode
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
