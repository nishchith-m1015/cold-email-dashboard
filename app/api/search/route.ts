import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ } from '@/lib/rate-limit';
import { canAccessWorkspace } from '@/lib/workspace-access';
import { pagesCatalog } from '@/lib/search-pages';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

const LIMIT = 5;

function buildIlike(term: string) {
  return `%${term.replace(/[%_]/g, '')}%`;
}

export async function GET(req: NextRequest) {
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`search:${clientId}`, RATE_LIMIT_READ);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').trim();
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  if (!query || query.length < 2) {
    return NextResponse.json({ campaigns: [], contacts: [], pages: pagesCatalog.slice(0, LIMIT) }, { headers: API_HEADERS });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503, headers: API_HEADERS });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: API_HEADERS });
  }

  const hasAccess = await canAccessWorkspace(userId, workspaceId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: API_HEADERS });
  }

  const term = buildIlike(query);

  // Search campaigns table directly (not daily_stats)
  const campaignsQuery = supabaseAdmin
    .from('campaigns')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .ilike('name', term)
    .limit(LIMIT)
    .order('name', { ascending: true });

  const contactsQuery = supabaseAdmin
    .from('contacts')
    .select('id, email')
    .eq('workspace_id', workspaceId)
    .ilike('email', term)
    .limit(LIMIT)
    .order('email', { ascending: true });

  const [campaignsRes, contactsRes] = await Promise.all([campaignsQuery, contactsQuery]);

  const campaigns =
    campaignsRes.data?.map((c) => ({
      id: c.id,
      name: c.name,
    })) || [];

  const contacts =
    contactsRes.data?.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.email, // display email as the name (only column available)
      company: '',
    })) || [];

  return NextResponse.json(
    {
      campaigns,
      contacts,
      pages: pagesCatalog.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())).slice(0, LIMIT),
    },
    { headers: API_HEADERS }
  );
}
