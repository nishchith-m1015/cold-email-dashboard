'use client';

import { useState } from 'react';
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
  AlertCircle
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-accent-primary/10 rounded-xl">
              <Zap className="h-8 w-8 text-accent-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Welcome, {user?.firstName || 'there'}!
          </h1>
          <p className="text-text-secondary text-lg">
            Choose how you want to get started with Cold Email Analytics
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-500">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3"
          >
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-green-500">{success}</p>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-card border border-border rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-accent-purple/10 rounded-xl">
                <Users className="h-6 w-6 text-accent-purple" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  Join a Team
                </h2>
                <p className="text-sm text-text-secondary">
                  Enter an invite code to access shared data
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  Team Invite Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g., TEAM-XXXX)"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-lg",
                      "bg-surface-elevated border border-border",
                      "text-text-primary placeholder:text-text-secondary",
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
                className="w-full gap-2"
              >
                {isJoining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Join Team
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                What you get:
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="h-4 w-4 text-accent-success" />
                  Access to shared campaign data
                </li>
                <li className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="h-4 w-4 text-accent-success" />
                  View analytics and metrics
                </li>
                <li className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="h-4 w-4 text-accent-success" />
                  Collaborate with team members
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-card border border-border rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-accent-primary/10 rounded-xl">
                <Plus className="h-6 w-6 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  Create Your Dashboard
                </h2>
                <p className="text-sm text-text-secondary">
                  Start fresh with your own workspace
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-text-secondary">
                Create a new empty dashboard and start tracking your own cold email campaigns.
              </p>

              <Button
                onClick={handleCreateDashboard}
                disabled={isCreating}
                variant="outline"
                className="w-full gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Empty Dashboard
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                Features included:
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-text-secondary">
                  <BarChart3 className="h-4 w-4 text-accent-primary" />
                  Full analytics dashboard
                </li>
                <li className="flex items-center gap-2 text-sm text-text-secondary">
                  <Shield className="h-4 w-4 text-accent-primary" />
                  Private & secure workspace
                </li>
                <li className="flex items-center gap-2 text-sm text-text-secondary">
                  <Users className="h-4 w-4 text-accent-primary" />
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
          className="text-center mt-8 text-sm text-text-secondary"
        >
          <p>Choose an option above to access the dashboard.</p>
          <p className="mt-1 text-xs opacity-70">
            You must join a team or create your own workspace to continue.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

