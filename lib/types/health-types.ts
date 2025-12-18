/**
 * Phase 32 Pillar 1: Health Status Types
 * Real-Time Synchronization Fabric
 */

// ============================================
// SYNC STATUS TYPES
// ============================================

/** Sync status states for n8n workflow health */
export type SyncStatus = 'live' | 'syncing' | 'stale' | 'error';

/** Database record shape from sync_status table */
export interface SyncStatusRecord {
  id: string;
  workspace_id: string;
  workflow_id: string;
  status: SyncStatus;
  last_heartbeat: string; // ISO timestamp
  version: number;
  error_message?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Client-side state for real-time health monitoring */
export interface RealtimeHealthState {
  status: SyncStatus;
  workflowId: string | null;
  lastHeartbeat: Date | null;
  errorMessage: string | null;
  isConnected: boolean;
  retryCount: number;
  version?: number;
}

/** Overall connection health for all services */
export interface ConnectionHealthState {
  supabase: 'ok' | 'error' | 'connecting';
  n8n: 'ok' | 'unreachable' | 'checking';
  clerk: 'authenticated' | 'expired' | 'validating';
}

/** Return type for useRealtimeHealth hook */
export interface UseRealtimeHealthReturn {
  health: RealtimeHealthState;
  connectionHealth: ConnectionHealthState;
  refresh: () => void;
  isLoading: boolean;
  error: Error | null;
}
