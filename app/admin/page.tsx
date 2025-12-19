/**
 * PHASE 36.2 - Admin Page (Mobile Responsive)
 * 
 * Super Admin dashboard page with Workspaces and Audit Log tabs.
 * Only accessible to users in SUPER_ADMIN_IDS.
 */

'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { SuperAdminPanel } from '@/components/admin/super-admin-panel';
import { AuditLogViewer } from '@/components/admin/audit-log-viewer';
import { Shield, AlertTriangle, Building2, ScrollText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/mobile';
import { Skeleton } from '@/components/ui/skeleton';

// Hardcoded for now - should match SUPER_ADMIN_IDS in workspace-access.ts
const SUPER_ADMIN_IDS = [
  'user_36QtXCPqQu6k0CXcYM0Sn2OQsgT', // Nishchith - Owner
];

type AdminTab = 'workspaces' | 'audit';

const TABS = [
  { id: 'workspaces' as const, label: 'Workspaces', icon: Building2 },
  { id: 'audit' as const, label: 'Audit Log', icon: ScrollText },
];

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<AdminTab>('workspaces');
  const [showTabPicker, setShowTabPicker] = useState(false);

  const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabData.icon;

  if (!isLoaded) {
    return (
      <div className="px-4 md:container md:mx-auto py-6 md:py-8 pb-24 md:pb-8">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !SUPER_ADMIN_IDS.includes(user.id)) {
    return (
      <div className="px-4 md:container md:mx-auto py-6 md:py-8 pb-24 md:pb-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl md:text-2xl font-bold">Access Denied</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2">
            This page is restricted to Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:container md:mx-auto py-6 md:py-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Shield className="h-5 w-5 md:h-6 md:w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Platform administration & governance
          </p>
        </div>
      </div>

      {/* Mobile: Tab Picker Button */}
      <div className="md:hidden">
        <button
          onClick={() => setShowTabPicker(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center gap-3">
            <ActiveIcon className="h-5 w-5 text-amber-500" />
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
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-text-primary hover:bg-surface-elevated'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{tab.label}</span>
                {isActive && (
                  <span className="ml-auto text-xs text-amber-500">Active</span>
                )}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Desktop: Tab Navigation */}
      <div className="hidden md:block border-b border-border">
        <nav className="flex gap-4" aria-label="Admin tabs">
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
                    ? 'border-amber-500 text-amber-500'
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
        {activeTab === 'workspaces' && (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="px-4 md:px-0 min-w-[600px] md:min-w-0">
              <SuperAdminPanel />
            </div>
          </div>
        )}
        {activeTab === 'audit' && (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="px-4 md:px-0">
              <AuditLogViewer />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
