'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Key, 
  ArrowRight, 
  Zap, 
  Shield, 
  BarChart3,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace-context';

export default function JoinTeamPageClient() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join team');
      }

      setSuccess(`Successfully joined ${data.workspace.name}! Redirecting...`);
      await refreshWorkspaces();
      switchWorkspace(data.workspace.id);
      router.push(`/?workspace_id=${data.workspace.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateDashboard = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: `${user?.firstName || 'My'}'s Dashboard`,
          createEmpty: true 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create dashboard');
      }

      setSuccess('Dashboard created! Redirecting...');
      await refreshWorkspaces();
      switchWorkspace(data.workspace.id);
      router.push(`/?workspace_id=${data.workspace.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dashboard');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-3xl -translate-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-2xl font-semibold text-white mb-2">
            Welcome, {user?.firstName || 'there'}!
          </h1>
          <p className="text-slate-400">
            Choose how you want to get started
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-red-500 text-sm">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3.5 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-green-500 text-sm">{success}</p>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
          >
            <div className="flex items-center gap-3 mb-5">
              <Users className="h-5 w-5 text-text-secondary" />
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Join a Team
                </h2>
                <p className="text-xs text-text-secondary">
                  Enter an invite code to access shared data
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5 font-medium">
                  Team Invite Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g., TEAM-XXXX)"
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-lg text-sm",
                      "bg-surface-elevated border border-border",
                      "text-text-primary placeholder:text-text-secondary/60",
                      "focus:outline-none focus:ring-2 focus:ring-accent-primary/50",
                      "transition-all"
                    )}
                    disabled={isJoining}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isJoining || !inviteCode.trim()}
                className="w-full h-9 text-sm"
              >
                {isJoining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join Team
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border">
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle className="h-3.5 w-3.5 text-accent-success" />
                  Access shared campaign data
                </li>
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle className="h-3.5 w-3.5 text-accent-success" />
                  View analytics and metrics
                </li>
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle className="h-3.5 w-3.5 text-accent-success" />
                  Collaborate with team members
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-card border border-border rounded-xl p-6 hover:border-border-hover transition-colors"
          >
            <div className="flex items-center gap-3 mb-5">
              <Building2 className="h-5 w-5 text-text-secondary" />
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Create Workspace
                </h2>
                <p className="text-xs text-text-secondary">
                  Start fresh with your own workspace
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Create a new empty dashboard and start tracking your own cold email campaigns.
              </p>

              <Button
                onClick={handleCreateDashboard}
                disabled={isCreating}
                variant="outline"
                className="w-full h-9 text-sm"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Empty Dashboard
                  </>
                )}
              </Button>
            </div>

            <div className="mt-5 pt-5 border-t border-border">
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <BarChart3 className="h-3.5 w-3.5 text-text-secondary" />
                  Full analytics dashboard
                </li>
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle className="h-3.5 w-3.5 text-text-secondary" />
                  Private & secure workspace
                </li>
                <li className="flex items-center gap-2 text-xs text-text-secondary">
                  <Users className="h-3.5 w-3.5 text-text-secondary" />
                  Invite team members later
                </li>
              </ul>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6 text-xs text-text-secondary"
        >
          <p>Choose an option above to access the dashboard.</p>
        </motion.div>
      </div>
    </div>
  );
}
