/**
 * Phase 32 Pillar 4: Manual Sync Trigger API
 * POST /api/sync/trigger
 * 
 * Allows workspace owners to manually trigger a workflow sync.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { canManageWorkspace } from '@/lib/workspace-access';
import { syncWorkflowsForWorkspace } from '@/lib/n8n-sync';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, number>();

function checkRateLimit(key: string): number | null {
  return rateLimitStore.get(key) || null;
}

function setRateLimit(key: string, timestamp: number): void {
  rateLimitStore.set(key, timestamp);
  setTimeout(() => rateLimitStore.delete(key), 60000); // Clear after 1 minute
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspace_id } = await req.json();
  
  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  // Only owners can manually trigger sync
  const canManage = await canManageWorkspace(userId, workspace_id);
  if (!canManage) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  // Rate limiting check (1 request per 30s)
  const rateLimitKey = `sync:${workspace_id}`;
  const lastSync = checkRateLimit(rateLimitKey);
  
  if (lastSync && (Date.now() - lastSync) < 30000) {
    return NextResponse.json({ 
      success: false, 
      retry_after: 30 - Math.floor((Date.now() - lastSync) / 1000)
    }, { status: 429 });
  }

  try {
    const result = await syncWorkflowsForWorkspace(workspace_id);
    
    setRateLimit(rateLimitKey, Date.now());

    return NextResponse.json({
      success: true,
      synced: result.updated,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Sync trigger error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Sync failed' 
    }, { status: 500 });
  }
}
