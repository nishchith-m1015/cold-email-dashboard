import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check if Supabase is configured
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Verify webhook token
  const token = req.headers.get('x-webhook-token');
  if (!token || token !== process.env.DASH_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
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
  } = body;

  // Validate required fields
  if (!contact_email || !event_type) {
    return NextResponse.json({ error: 'Missing required fields: contact_email, event_type' }, { status: 400 });
  }

  if (!['sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked'].includes(event_type)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }

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

    // Generate unique event key for deduplication
    const eventKey = `${provider || 'unknown'}:${provider_message_id || contact_email}:${event_type}:${step || 0}`;

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
      });

    if (eventError) {
      // Check if duplicate (idempotent)
      if (eventError.message?.toLowerCase().includes('duplicate') || 
          eventError.code === '23505') {
        return NextResponse.json({ ok: true, deduped: true });
      }
      console.error('Event insert error:', eventError);
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'events' });
}

