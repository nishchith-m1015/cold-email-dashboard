/**
 * n8n Webhook Endpoint
 * 
 * Phase 31 Pillar 5: The Synchronization Loop
 * POST /api/webhooks/n8n
 * 
 * Receives status change notifications from n8n workflows.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

interface N8nWebhookPayload {
  workflow_id: string;
  workflow_name?: string;
  active: boolean;
  timestamp: string;
  event_type: 'activation' | 'deactivation' | 'error';
}

interface WebhookResponse {
  success: boolean;
  message?: string;
  updated?: number;
}

// ============================================
// HELPERS
// ============================================

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  
  // If no secret configured, skip verification (dev mode)
  if (!secret) {
    console.warn('N8N_WEBHOOK_SECRET not set - skipping signature verification');
    return true;
  }
  
  if (!signature) {
    return false;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(req: NextRequest): Promise<NextResponse<WebhookResponse>> {
  // 1. Check database configuration
  if (!supabaseAdmin) {
    return NextResponse.json(
      { success: false, message: 'Database not configured' },
      { status: 503 }
    );
  }

  // 2. Read raw body for signature verification
  const body = await req.text();
  
  // 3. Verify webhook signature
  const signature = req.headers.get('x-n8n-signature');
  if (!verifySignature(body, signature)) {
    console.error('Invalid webhook signature');
    return NextResponse.json(
      { success: false, message: 'Invalid signature' },
      { status: 401 }
    );
  }

  // 4. Parse payload
  let payload: N8nWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  // 5. Validate required fields
  const { workflow_id, active, timestamp, event_type } = payload;
  
  if (!workflow_id || typeof active !== 'boolean' || !timestamp) {
    return NextResponse.json(
      { success: false, message: 'Missing required fields: workflow_id, active, timestamp' },
      { status: 400 }
    );
  }

  // 6. Determine new status
  let newN8nStatus: string;
  if (event_type === 'error') {
    newN8nStatus = 'error';
  } else {
    newN8nStatus = active ? 'active' : 'inactive';
  }

  // 7. Update campaigns with matching workflow_id
  // Only update if the incoming timestamp is newer than last_sync_at
  const webhookTime = new Date(timestamp).toISOString();
  
  const { data: updatedCampaigns, error: updateError } = await supabaseAdmin
    .from('campaigns')
    .update({
      n8n_status: newN8nStatus,
      last_sync_at: webhookTime,
      updated_at: new Date().toISOString(),
    })
    .eq('n8n_workflow_id', workflow_id)
    .or(`last_sync_at.is.null,last_sync_at.lt.${webhookTime}`)
    .select('id');

  if (updateError) {
    console.error('Webhook update error:', updateError);
    return NextResponse.json(
      { success: false, message: 'Database update failed' },
      { status: 500 }
    );
  }

  const updatedCount = updatedCampaigns?.length ?? 0;

  console.log(`[n8n Webhook] Updated ${updatedCount} campaigns for workflow ${workflow_id} -> ${newN8nStatus}`);

  return NextResponse.json({
    success: true,
    message: `Updated ${updatedCount} campaign(s)`,
    updated: updatedCount,
  });
}
