import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_STRICT, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { canWriteToWorkspace } from '@/lib/workspace-access';

// PILLAR 5: Import sanitization (settings endpoint doesn't return full workspace, but enforce safe pattern)
import { sanitizeWorkspace } from '@/lib/response-sanitizer';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

type Payload = {
  workspace_id?: string;
  timezone?: string;
  auto_refresh_seconds?: number;
  workspace_name?: string;
  date_format?: 'US' | 'EU';
  currency?: string;
};

function sanitizeAutoRefresh(value: any): number | null {
  const allowed = [0, 30, 60];
  const num = Number(value);
  if (Number.isFinite(num) && allowed.includes(num)) return num;
  return null;
}

export async function GET(req: NextRequest) {
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-settings:${clientId}`, RATE_LIMIT_READ);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: API_HEADERS });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503, headers: API_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400, headers: API_HEADERS });
  }

  const canWrite = await canWriteToWorkspace(userId, workspaceId);
  if (!canWrite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
  }

  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500, headers: API_HEADERS });
  }

  return NextResponse.json({ settings: data?.settings || {} }, { headers: API_HEADERS });
}

export async function PATCH(req: NextRequest) {
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`workspace-settings-update:${clientId}`, RATE_LIMIT_STRICT);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: API_HEADERS });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503, headers: API_HEADERS });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: API_HEADERS });
  }

  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400, headers: API_HEADERS });
  }

  const canWrite = await canWriteToWorkspace(userId, workspaceId);
  if (!canWrite) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
  }

  const timezone = typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : undefined;
  const autoRefresh = sanitizeAutoRefresh(body.auto_refresh_seconds);
  const workspaceName = typeof body.workspace_name === 'string' && body.workspace_name.trim() ? body.workspace_name.trim() : undefined;
  const dateFormat = body.date_format === 'US' || body.date_format === 'EU' ? body.date_format : undefined;
  const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : undefined;

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single();

  if (loadErr) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500, headers: API_HEADERS });
  }

  const nextSettings = { ...(existing?.settings || {}) };
  if (timezone !== undefined) nextSettings.timezone = timezone;
  if (autoRefresh !== null) nextSettings.auto_refresh_seconds = autoRefresh;
  if (workspaceName !== undefined) nextSettings.workspace_name = workspaceName;
  if (dateFormat !== undefined) nextSettings.date_format = dateFormat;
  if (currency !== undefined) nextSettings.currency = currency;

  const { error: updateErr } = await supabaseAdmin
    .from('workspaces')
    .update({ settings: nextSettings, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500, headers: API_HEADERS });
  }

  return NextResponse.json({ success: true, settings: nextSettings }, { headers: API_HEADERS });
}

