/**
 * Phase 32 Pillar 4: n8n Sync Logic
 * Real-Time Synchronization Fabric - Background Sync Worker
 * 
 * Syncs campaign statuses with n8n workflow states.
 */

import { supabaseAdmin } from './supabase';
import { getWorkflows } from './n8n-client';
import type { N8nStatus } from './dashboard-types';

interface SyncResult {
  updated: number;
  errors: string[];
}

/**
 * Sync all campaigns for a workspace with their n8n workflow statuses
 */
export async function syncWorkflowsForWorkspace(workspaceId: string): Promise<SyncResult> {
  const result: SyncResult = {
    updated: 0,
    errors: [],
  };

  if (!supabaseAdmin) {
    result.errors.push('Database not configured');
    return result;
  }

  try {
    // Fetch campaigns with n8n_workflow_id
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, n8n_workflow_id, version')
      .eq('workspace_id', workspaceId)
      .not('n8n_workflow_id', 'is', null);

    if (!campaigns || campaigns.length === 0) {
      return result;
    }

    // Fetch workflow statuses from n8n
    const workflowsResult = await getWorkflows();
    
    if (!workflowsResult.success) {
      result.errors.push(`n8n API error: ${workflowsResult.error.message}`);
      return result;
    }

    const workflowMap = new Map(
      workflowsResult.data.map(wf => [wf.id, wf.active ? 'active' : 'inactive'])
    );

    // Update each campaign
    for (const campaign of campaigns) {
      const n8nStatus = workflowMap.get(campaign.n8n_workflow_id!) as N8nStatus || 'unknown';
      
      const { error } = await supabaseAdmin
        .from('campaigns')
        .update({
          n8n_status: n8nStatus,
          last_sync_at: new Date().toISOString(),
          version: campaign.version + 1,
        })
        .eq('id', campaign.id)
        .eq('version', campaign.version); // Optimistic locking

      if (error) {
        result.errors.push(`Failed to update ${campaign.id}: ${error.message}`);
      } else {
        result.updated++;
      }
    }

    return result;
  } catch (error) {
    result.errors.push(`Sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return result;
  }
}
