/**
 * PHASE 34 - SETTINGS PAGE
 * 
 * Workspace settings page with members management tab.
 * Integrates WorkspaceMembersTable for RBAC visualization.
 */

'use client';

import { useState } from 'react';
import { WorkspaceMembersTable } from '@/components/settings/workspace-members-table';
import { GeneralSettingsTab } from '@/components/settings/general-settings-tab';
import { SecuritySettingsTab } from '@/components/settings/security-settings-tab';
import { useWorkspace } from '@/lib/workspace-context';
import { Users, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'general' | 'members' | 'security';

const TABS = [
  { id: 'general' as const, label: 'General', icon: Settings },
  { id: 'members' as const, label: 'Members', icon: Users },
  { id: 'security' as const, label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('members');
  const { workspace, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-destructive">No workspace selected</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage {workspace.name || 'your workspace'} configuration
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4" aria-label="Settings tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'general' && (
          <GeneralSettingsTab />
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Team Members</h2>
                <p className="text-sm text-muted-foreground">
                  Manage who has access to this workspace and their permissions
                </p>
              </div>
            </div>
            <WorkspaceMembersTable />
          </div>
        )}

        {activeTab === 'security' && (
          <SecuritySettingsTab />
        )}
      </div>
    </div>
  );
}
