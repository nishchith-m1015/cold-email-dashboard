'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

/**
 * UserSyncProvider - Self-Healing User Sync
 * 
 * Automatically syncs the current user from Clerk to Supabase if missing.
 * This prevents "Orphaned User" issues when webhooks fail.
 * 
 * Runs once per session on mount.
 */
export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Only sync once per session
    if (!isLoaded || !user || hasSynced.current) return;

    const syncUser = async () => {
      try {
        const response = await fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          /* eslint-disable-next-line no-console */
          console.warn('[UserSync] Failed to sync user:', await response.text());
        } else {
          const data = await response.json();
          if (data.synced) {
            /* eslint-disable-next-line no-console */
            console.log('[UserSync] User synced successfully');
          }
        }
      } catch (error) {
        console.error('[UserSync] Error syncing user:', error);
      }
    };

    hasSynced.current = true;
    syncUser();
  }, [user, isLoaded]);

  return <>{children}</>;
}
