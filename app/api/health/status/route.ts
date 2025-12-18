import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { SyncStatusRecord } from '@/lib/types/health-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/status
 * Returns current sync status for the user's workspace
 * 
 * Query Params:
 * - workspace_id: string (required)
 * 
 * Response:
 * - 200: { status, workflow_id, last_heartbeat, error_message, version }
 * - 401: Unauthorized
 * - 403: Access denied
 * - 400: Missing workspace_id
 * - 500: Database error
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }

  try {
    // Check database connection
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify user has access to workspace
    const { data: membership } = await supabaseAdmin
      .from('user_workspaces')
      .select('role')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch sync status
    const { data, error } = await supabaseAdmin
      .from('sync_status')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Health status query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        status: 'unknown',
        message: 'No sync data available',
      });
    }

    const record = data as SyncStatusRecord;

    // Check if stale
    const lastHeartbeat = new Date(record.last_heartbeat);
    const now = new Date();
    const isStale = (now.getTime() - lastHeartbeat.getTime()) > 60000; // 60s threshold

    return NextResponse.json({
      status: isStale ? 'stale' : record.status,
      workflow_id: record.workflow_id,
      last_heartbeat: record.last_heartbeat,
      error_message: record.error_message,
      version: record.version,
    });
  } catch (err) {
    console.error('Health status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
