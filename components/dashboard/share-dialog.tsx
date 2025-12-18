'use client';

/**
 * Share Dialog Component
 * 
 * Google Docs-style sharing dialog for inviting members
 * and managing team roles.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  UserPlus,
  Users,
  Trash2,
  Link2,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';
import { useInvites } from '@/hooks/use-invites';
import { useMembers, WorkspaceMember } from '@/hooks/use-members';
import { WorkspaceRole } from '@/lib/workspace-access';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'invite' | 'members';

const ROLE_OPTIONS: { value: WorkspaceRole; label: string; icon: typeof Crown }[] = [
  { value: 'admin', label: 'Admin', icon: Shield },
  { value: 'member', label: 'Member', icon: User },
  { value: 'viewer', label: 'Viewer', icon: Eye },
];

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>('invite');
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('member');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { invites, createInvite, revokeInvite, isLoading: invitesLoading } = useInvites();
  const { members, canManage, updateRole, removeMember, isLoading: membersLoading } = useMembers();

  const handleCreateInvite = async () => {
    setError(null);
    setIsCreating(true);
    const result = await createInvite({ role: selectedRole });
    setIsCreating(false);
    
    if (!result.success) {
      setError(result.error || 'Failed to create invite');
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const result = await revokeInvite(inviteId);
    if (!result.success) {
      setError(result.error || 'Failed to revoke invite');
    }
  };

  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    const result = await updateRole(userId, newRole);
    if (!result.success) {
      setError(result.error || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!confirm(`Remove ${member.name || member.email} from this workspace?`)) return;
    const result = await removeMember(member.userId);
    if (!result.success) {
      setError(result.error || 'Failed to remove member');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Share &ldquo;{workspace?.name || 'Workspace'}&rdquo;
                </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Invite team members or manage access
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <X className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveTab('invite')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === 'invite'
                      ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] -mb-px'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite People
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === 'members'
                      ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] -mb-px'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Users className="h-4 w-4" />
                  Team Members ({members.length})
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                  <button onClick={() => setError(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Tab Content */}
              <div className="p-6 max-h-[400px] overflow-y-auto">
                {activeTab === 'invite' && (
                  <div className="space-y-6">
                    {/* Create Invite Section */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--text-primary)]">
                        Generate Invite Link
                      </label>
                      <div className="flex gap-3">
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as WorkspaceRole)}
                          className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          onClick={handleCreateInvite}
                          disabled={isCreating || !canManage}
                          className="gap-2"
                        >
                          {isCreating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                          Generate
                        </Button>
                      </div>
                      {!canManage && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          You need Admin permissions to create invites.
                        </p>
                      )}
                    </div>

                    {/* Active Invites */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--text-primary)]">
                        Active Invite Codes
                      </label>
                      {invitesLoading ? (
                        <div className="flex items-center justify-center py-4 text-sm text-[var(--text-secondary)]">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : invites.length === 0 ? (
                        <div className="text-center py-4 text-sm text-[var(--text-secondary)]">
                          No active invite codes
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {invites.map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)]"
                            >
                              <div className="flex items-center gap-3">
                                <code className="px-2 py-1 rounded bg-[var(--surface)] text-sm font-mono text-[var(--text-primary)]">
                                  {invite.code}
                                </code>
                                <RoleBadge role={invite.role} size="sm" />
                                {invite.usesRemaining !== null && (
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    {invite.usesRemaining} uses left
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopyCode(invite.code)}
                                  className="p-1.5 rounded hover:bg-[var(--surface)] transition-colors"
                                  title="Copy code"
                                >
                                  {copiedCode === invite.code ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-[var(--text-secondary)]" />
                                  )}
                                </button>
                                {canManage && (
                                  <button
                                    onClick={() => handleRevokeInvite(invite.id)}
                                    className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                                    title="Revoke invite"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-2">
                    {membersLoading ? (
                      <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading members...
                      </div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-8 text-sm text-[var(--text-secondary)]">
                        No members found
                      </div>
                    ) : (
                      members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={member.imageUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                  {member.name || 'Unnamed User'}
                                </span>
                                {member.isCurrentUser && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.role === 'owner' ? (
                              <RoleBadge role="owner" size="sm" />
                            ) : canManage && !member.isCurrentUser ? (
                              <>
                                <select
                                  value={member.role}
                                  onChange={(e) => handleRoleChange(member.userId, e.target.value as WorkspaceRole)}
                                  className="px-2 py-1 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                >
                                  {ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member)}
                                  className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </>
                            ) : (
                              <RoleBadge role={member.role} size="sm" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
