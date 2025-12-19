import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { extractWorkspaceId, canAccessWorkspace } from '@/lib/api-workspace-guard';
import { DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

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

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

interface ConfigItem {
  id: string;
  config_key: string;
  config_value: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  is_sensitive: boolean;
  updated_at: string;
}

/**
 * GET /api/workspaces/config
 * 
 * Fetch all configuration parameters for a workspace.
 * All authenticated users with workspace access can read.
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

    const workspaceId = extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;
    const { hasAccess } = await canAccessWorkspace(userId, workspaceId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this workspace' },
        { status: 403, headers: API_HEADERS }
      );
    }

    const { data: configs, error } = await supabase
      .from('workspace_config')
      .select('id, config_key, config_value, value_type, description, is_sensitive, updated_at')
      .eq('workspace_id', workspaceId)
      .order('config_key');

    if (error) {
      /* eslint-disable-next-line no-console */
      console.error('[Config API] GET error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Parse values based on type
    const parsedConfigs = (configs || []).map((cfg: ConfigItem) => {
      let parsedValue: string | number | boolean | object = cfg.config_value;
      
      if (cfg.value_type === 'number') {
        parsedValue = parseFloat(cfg.config_value);
      } else if (cfg.value_type === 'boolean') {
        parsedValue = cfg.config_value === 'true';
      } else if (cfg.value_type === 'json') {
        try {
          parsedValue = JSON.parse(cfg.config_value);
        } catch {
          parsedValue = cfg.config_value;
        }
      }

      return {
        key: cfg.config_key,
        value: parsedValue,
        rawValue: cfg.config_value,
        type: cfg.value_type,
        description: cfg.description,
        isSensitive: cfg.is_sensitive,
        updatedAt: cfg.updated_at,
      };
    });

    return NextResponse.json({ configs: parsedConfigs }, { headers: API_HEADERS });

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Config API] GET exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * PATCH /api/workspaces/config
 * 
 * Update configuration parameters for a workspace.
 * Only workspace OWNERS can modify.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: API_HEADERS }
      );
    }

    const body = await req.json();
    const workspaceId = body.workspace_id || extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;

    // Check ownership (only owners can modify config)
    const { data: membership } = await supabase
      .from('user_workspaces')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only workspace owners can modify configuration' },
        { status: 403, headers: API_HEADERS }
      );
    }

    // Validate updates
    const updates = body.updates;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Process each update
    const results: { key: string; success: boolean; error?: string }[] = [];

    for (const update of updates) {
      const { key, value } = update;

      if (!key) {
        results.push({ key: 'unknown', success: false, error: 'Missing key' });
        continue;
      }

      // Convert value to string for storage
      const stringValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);

      const { error: updateError } = await supabase
        .from('workspace_config')
        .update({ 
          config_value: stringValue,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('config_key', key);

      if (updateError) {
        /* eslint-disable-next-line no-console */
        console.error(`[Config API] Update error for ${key}:`, updateError);
        results.push({ key, success: false, error: updateError.message });
      } else {
        results.push({ key, success: true });
      }
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json(
      { 
        success: allSuccess,
        results,
        message: allSuccess ? 'Configuration updated' : 'Some updates failed'
      },
      { status: allSuccess ? 200 : 207, headers: API_HEADERS }
    );

  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[Config API] PATCH exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
