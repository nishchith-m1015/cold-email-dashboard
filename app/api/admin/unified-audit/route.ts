import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Super Admin IDs
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '').split(',').filter(Boolean);

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

interface AuditEntry {
  id: string;
  source: 'governance' | 'role' | 'vault';
  action: string;
  actor_id: string;
  actor_email?: string;
  workspace_id?: string;
  workspace_name?: string;
  target_user_id?: string;
  details?: string;
  created_at: string;
}

/**
 * GET /api/admin/unified-audit
 * 
 * Aggregates audit logs from multiple sources:
 * - governance_audit_log (freeze/unfreeze actions)
 * - role_audit_log (role changes)
 * - workspace_keys_audit (vault access)
 * 
 * Super Admin only.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    // Check Super Admin
    if (!SUPER_ADMIN_IDS.includes(userId)) {
      return NextResponse.json(
        { error: 'Super Admin access required' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const workspace_id = searchParams.get('workspace_id');
    const source = searchParams.get('source'); // 'governance', 'role', 'vault', or null for all

    const entries: AuditEntry[] = [];

    // 1. Fetch governance audit logs
    if (!source || source === 'governance') {
      let query = supabase
        .from('governance_audit_log')
        .select('id, action, actor_id, actor_email, workspace_id, workspace_name, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (workspace_id) {
        query = query.eq('workspace_id', workspace_id);
      }

      const { data: govLogs } = await query;

      if (govLogs) {
        govLogs.forEach((log: { id: string; action: string; actor_id: string; actor_email: string; workspace_id: string; workspace_name: string; reason: string; created_at: string }) => {
          entries.push({
            id: log.id,
            source: 'governance',
            action: log.action,
            actor_id: log.actor_id,
            actor_email: log.actor_email,
            workspace_id: log.workspace_id,
            workspace_name: log.workspace_name,
            details: log.reason,
            created_at: log.created_at,
          });
        });
      }
    }

    // 2. Fetch role audit logs
    if (!source || source === 'role') {
      let query = supabase
        .from('role_audit_log')
        .select('id, actor_id, target_user_id, old_role, new_role, workspace_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (workspace_id) {
        query = query.eq('workspace_id', workspace_id);
      }

      const { data: roleLogs } = await query;

      if (roleLogs) {
        roleLogs.forEach((log: { id: string; actor_id: string; target_user_id: string; old_role: string; new_role: string; workspace_id: string; created_at: string }) => {
          entries.push({
            id: log.id,
            source: 'role',
            action: `role_change`,
            actor_id: log.actor_id,
            workspace_id: log.workspace_id,
            target_user_id: log.target_user_id,
            details: `Changed role from ${log.old_role} to ${log.new_role}`,
            created_at: log.created_at,
          });
        });
      }
    }

    // 3. Fetch vault audit logs
    if (!source || source === 'vault') {
      let query = supabase
        .from('workspace_keys_audit')
        .select('id, actor_id, workspace_id, action, provider, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (workspace_id) {
        query = query.eq('workspace_id', workspace_id);
      }

      const { data: vaultLogs } = await query;

      if (vaultLogs) {
        vaultLogs.forEach((log: { id: string; actor_id: string; workspace_id: string; action: string; provider: string; created_at: string }) => {
          entries.push({
            id: log.id,
            source: 'vault',
            action: `vault_${log.action.toLowerCase()}`,
            actor_id: log.actor_id,
            workspace_id: log.workspace_id,
            details: `Provider: ${log.provider || 'unknown'}`,
            created_at: log.created_at,
          });
        });
      }
    }

    // Sort all entries by created_at descending
    entries.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Limit final result
    const limitedEntries = entries.slice(0, limit);

    return NextResponse.json({
      entries: limitedEntries,
      count: limitedEntries.length,
      hasMore: entries.length > limit,
    }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Unified Audit] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
