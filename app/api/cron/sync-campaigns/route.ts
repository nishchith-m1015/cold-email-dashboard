/**
 * Campaign Sync Cron Endpoint
 * 
 * Phase 31 Pillar 5: The Synchronization Loop
 * POST /api/cron/sync-campaigns
 * 
 * Batch syncs all campaigns from n8n (fallback reconciliation).
 * Should be called by a cron job every 5 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getWorkflow, isN8nConfigured } from '@/lib/n8n-client';

// ============================================
// TYPES
// ============================================

interface SyncResult {
  success: boolean;
  campaigns_checked: number;
  campaigns_updated: number;
  campaigns_errored: number;
  duration_ms: number;
  error?: string;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(req: NextRequest): Promise<NextResponse<SyncResult>> {
  const startTime = Date.now();

  // 1. Verify cron token
  const token = req.headers.get('x-cron-token') || 
    new URL(req.url).searchParams.get('token');
  const expectedToken = process.env.CRON_SECRET || process.env.MATERIALIZED_VIEWS_REFRESH_TOKEN;

  if (!token || token !== expectedToken) {
    return NextResponse.json(
      { 
        success: false, 
        campaigns_checked: 0, 
        campaigns_updated: 0, 
        campaigns_errored: 0,
        duration_ms: Date.now() - startTime,
        error: 'Unauthorized - invalid or missing token'
      },
      { status: 401 }
    );
  }

  // 2. Check database configuration
  if (!supabaseAdmin) {
    return NextResponse.json(
      { 
        success: false, 
        campaigns_checked: 0, 
        campaigns_updated: 0, 
        campaigns_errored: 0,
        duration_ms: Date.now() - startTime,
        error: 'Database not configured'
      },
      { status: 503 }
    );
  }

  // 3. Check n8n configuration
  if (!isN8nConfigured()) {
    return NextResponse.json(
      { 
        success: false, 
        campaigns_checked: 0, 
        campaigns_updated: 0, 
        campaigns_errored: 0,
        duration_ms: Date.now() - startTime,
        error: 'n8n API not configured'
      },
      { status: 503 }
    );
  }

  // 4. Fetch all campaigns with n8n_workflow_id
  const { data: campaigns, error: fetchError } = await supabaseAdmin
    .from('campaigns')
    .select('id, n8n_workflow_id, n8n_status, last_sync_at')
    .not('n8n_workflow_id', 'is', null);

  if (fetchError) {
    console.error('Sync cron: Failed to fetch campaigns', fetchError);
    return NextResponse.json(
      { 
        success: false, 
        campaigns_checked: 0, 
        campaigns_updated: 0, 
        campaigns_errored: 0,
        duration_ms: Date.now() - startTime,
        error: 'Failed to fetch campaigns'
      },
      { status: 500 }
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      success: true,
      campaigns_checked: 0,
      campaigns_updated: 0,
      campaigns_errored: 0,
      duration_ms: Date.now() - startTime,
    });
  }

  // 5. Sync each campaign with n8n
  let updatedCount = 0;
  let erroredCount = 0;

  for (const campaign of campaigns) {
    if (!campaign.n8n_workflow_id) continue;

    try {
      // Fetch workflow status from n8n
      const result = await getWorkflow(campaign.n8n_workflow_id);

      if (!result.success) {
        // Workflow not found or error
        console.warn(`Sync cron: Failed to fetch workflow ${campaign.n8n_workflow_id}`, result.error);
        
        // Mark as error if it was previously active
        if (campaign.n8n_status !== 'error' && campaign.n8n_status !== 'unknown') {
          await supabaseAdmin
            .from('campaigns')
            .update({
              n8n_status: 'error',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaign.id);
          erroredCount++;
        }
        continue;
      }

      // Determine new status
      const newStatus = result.data.active ? 'active' : 'inactive';

      // Only update if status changed
      if (campaign.n8n_status !== newStatus) {
        const { error: updateError } = await supabaseAdmin
          .from('campaigns')
          .update({
            n8n_status: newStatus,
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaign.id);

        if (updateError) {
          console.error(`Sync cron: Failed to update campaign ${campaign.id}`, updateError);
          erroredCount++;
        } else {
          updatedCount++;
          console.log(`[Sync Cron] Updated campaign ${campaign.id}: ${campaign.n8n_status} -> ${newStatus}`);
        }
      }
    } catch (err) {
      console.error(`Sync cron: Exception for campaign ${campaign.id}`, err);
      erroredCount++;
    }
  }

  const duration = Date.now() - startTime;

  console.log(`[Sync Cron] Completed: ${campaigns.length} checked, ${updatedCount} updated, ${erroredCount} errored in ${duration}ms`);

  return NextResponse.json({
    success: true,
    campaigns_checked: campaigns.length,
    campaigns_updated: updatedCount,
    campaigns_errored: erroredCount,
    duration_ms: duration,
  });
}
