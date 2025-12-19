/**
 * PHASE 34 - SETTINGS PAGE (Mobile Responsive)
 * 
 * Workspace settings page with members management tab.
 * Mobile: Dropdown tab picker
 * Desktop: Standard horizontal tabs
 */

'use client';

import { useState } from 'react';
import { WorkspaceMembersTable } from '@/components/settings/workspace-members-table';
import { GeneralSettingsTab } from '@/components/settings/general-settings-tab';
import { SecuritySettingsTab } from '@/components/settings/security-settings-tab';
import { ConfigVaultTab } from '@/components/settings/config-vault-tab';
import { useWorkspace } from '@/lib/workspace-context';
import { Users, Settings, Shield, Sliders, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/mobile';
import { Skeleton } from '@/components/ui/skeleton';

type SettingsTab = 'general' | 'members' | 'security' | 'configuration';

const TABS = [
  { id: 'general' as const, label: 'General', icon: Settings },
  { id: 'members' as const, label: 'Members', icon: Users },
  { id: 'security' as const, label: 'Security', icon: Shield },
  { id: 'configuration' as const, label: 'Config', icon: Sliders },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('members');
  const [showTabPicker, setShowTabPicker] = useState(false);
  const { workspace, isLoading } = useWorkspace();

  const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabData.icon;

  if (isLoading) {
    return (
      <div className="px-4 md:container md:mx-auto py-6 md:py-8 space-y-6 pb-24 md:pb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="px-4 md:container md:mx-auto py-6 md:py-8 pb-24 md:pb-8">
        <div className="text-destructive">No workspace selected</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:container md:mx-auto py-6 md:py-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Manage {workspace.name || 'your workspace'} configuration
        </p>
      </div>

      {/* Mobile: Tab Picker Button */}
      <div className="md:hidden">
        <button
          onClick={() => setShowTabPicker(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center gap-3">
            <ActiveIcon className="h-5 w-5 text-accent-primary" />
            <span className="text-sm font-medium text-text-primary">{activeTabData.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        </button>
      </div>

      {/* Mobile: Tab Picker Bottom Sheet */}
      <BottomSheet
        open={showTabPicker}
        onClose={() => setShowTabPicker(false)}
        title="Select Tab"
      >
        <div className="space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowTabPicker(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-primary hover:bg-surface-elevated'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isActive && (
                  <span className="ml-auto text-xs text-accent-primary">Active</span>
                )}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Desktop: Tab Navigation */}
      <div className="hidden md:block border-b border-border">
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
      <div className="min-h-[300px] md:min-h-[400px]">
        {activeTab === 'general' && (
          <GeneralSettingsTab />
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-semibold">Team Members</h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Manage who has access to this workspace
                </p>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="px-4 md:px-0 min-w-[600px] md:min-w-0">
                <WorkspaceMembersTable />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <SecuritySettingsTab />
        )}

        {activeTab === 'configuration' && (
          <ConfigVaultTab />
        )}
      </div>
    </div>
  );
}
