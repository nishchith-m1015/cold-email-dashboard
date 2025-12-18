/**
 * PHASE 34.4 - Admin Page
 * 
 * Super Admin dashboard page.
 * Only accessible to users in SUPER_ADMIN_IDS.
 */

'use client';

import { useUser } from '@clerk/nextjs';
import { SuperAdminPanel } from '@/components/admin/super-admin-panel';
import { Shield, AlertTriangle } from 'lucide-react';

// Hardcoded for now - should match SUPER_ADMIN_IDS in workspace-access.ts
const SUPER_ADMIN_IDS = [
  'user_36QtXCPqQu6k0CXcYM0Sn2OQsgT', // Nishchith - Owner
];

export default function AdminPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || !SUPER_ADMIN_IDS.includes(user.id)) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            This page is restricted to Super Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Shield className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform administration and monitoring
          </p>
        </div>
      </div>

      {/* Super Admin Panel */}
      <SuperAdminPanel />
    </div>
  );
}
