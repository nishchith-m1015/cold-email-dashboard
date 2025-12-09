import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { z } from 'zod';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Zod schema for event validation
const eventSchema = z.object({
  contact_email: z.string().email('Invalid email format'),
  campaign: z.string().max(200).optional(),
  step: z.number().int().min(1).max(10).optional(),
  event_type: z.enum(['sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked']),
  provider: z.string().max(50).optional(),
  provider_message_id: z.string().max(200).optional(),
  event_ts: z.string().datetime().optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  workspace_id: z.string().max(100).optional(),
  idempotency_key: z.string().max(200),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`events:${clientId}`, RATE_LIMIT_WEBHOOK);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Check if Supabase is configured
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify webhook token
  const token = req.headers.get('x-webhook-token');
  if (!token || token !== process.env.DASH_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = eventSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: validation.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const {
    contact_email,
    campaign,
    step,
    event_type,
    provider,
    provider_message_id,
    event_ts,
    subject,
    body: email_body,
    workspace_id,
    idempotency_key,
    metadata,
  } = validation.data;

  const workspaceId = workspace_id || DEFAULT_WORKSPACE_ID;
  const campaignName = campaign || 'Default Campaign';
  const eventTs = event_ts ? new Date(event_ts).toISOString() : new Date().toISOString();

  try {
    // Upsert contact
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .upsert(
        { 
          workspace_id: workspaceId, 
          email: contact_email 
        },
        { onConflict: 'workspace_id,email' }
      )
      .select('id')
      .single();

    if (contactError && !contactError.message.includes('duplicate')) {
      console.error('Contact upsert error:', contactError);
    }

    const contactId = contact?.id || null;

    // For 'sent' events, also upsert the email record
    if (event_type === 'sent' && step) {
      const { error: emailError } = await supabaseAdmin
        .from('emails')
        .upsert({
          contact_id: contactId,
          workspace_id: workspaceId,
          step: step,
          subject: subject || null,
          body: email_body || null,
          provider: provider || 'gmail',
          provider_message_id: provider_message_id || null,
          sent_at: eventTs,
        }, { onConflict: 'contact_id,campaign_id,step' });

      if (emailError) {
        console.error('Email upsert error:', emailError);
      }
    }

    // Idempotency: short-circuit if this key already exists for workspace
    if (idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from('email_events')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('metadata->>idempotency_key', idempotency_key)
        .limit(1);
      if (existing && existing.length > 0) {
        return NextResponse.json({ ok: true, deduped: true }, { headers: rateLimitHeaders(rateLimit) });
      }
    }

    // Generate unique event key for deduplication
    const eventKey = idempotency_key || `${provider || 'unknown'}:${provider_message_id || contact_email}:${event_type}:${step || 0}`;

    // Insert event
    const { error: eventError } = await supabaseAdmin
      .from('email_events')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        contact_email,
        campaign_name: campaignName,
        step: step || null,
        event_type,
        event_ts: eventTs,
        provider: provider || null,
        provider_message_id: provider_message_id || null,
        event_key: eventKey,
        metadata: { ...(metadata || {}), idempotency_key },
      });

    if (eventError) {
      // Check if duplicate (idempotent)
      if (eventError.message?.toLowerCase().includes('duplicate') || 
          eventError.code === '23505') {
        return NextResponse.json({ ok: true, deduped: true }, { headers: rateLimitHeaders(rateLimit) });
      }
      console.error('Event insert error:', eventError);
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'events' });
}
