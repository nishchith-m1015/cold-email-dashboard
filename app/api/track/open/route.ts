import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

// 1x1 transparent GIF (43 bytes)
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Get tracking parameters
  const contactEmail = searchParams.get('e') || searchParams.get('email');
  const campaign = searchParams.get('c') || searchParams.get('campaign') || 'Unknown';
  const step = parseInt(searchParams.get('s') || searchParams.get('step') || '1', 10);
  const token = searchParams.get('t') || searchParams.get('token'); // Unique token for deduplication
  const workspaceId = searchParams.get('w') || searchParams.get('workspace_id');
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
  }
  
  // Always return the pixel immediately (non-blocking tracking)
  const response = new NextResponse(TRACKING_PIXEL as any, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });

  // Track the open event asynchronously (don't block pixel response)
  if (contactEmail && supabaseAdmin && workspaceId) {
    // Fire and forget - don't await
    trackOpenEvent(contactEmail, campaign, step, token, workspaceId).catch((err) => {
      /* eslint-disable-next-line no-console */
      console.error(err);
    });
  }

  return response;
}

async function trackOpenEvent(
  contactEmail: string,
  campaign: string,
  step: number,
  token: string | null,
  workspaceId: string
) {
  if (!supabaseAdmin) return;

  try {
    // Check for duplicate opens (same email + token within 24 hours)
    if (token) {
      const { data: existing } = await supabaseAdmin
        .from('email_events')
        .select('id')
        .eq('contact_email', contactEmail)
        .eq('event_type', 'opened')
        .eq('metadata->>token', token)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        // Already tracked this open, skip
        return;
      }
    }

    // Get or create contact
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .upsert(
        {
          email: contactEmail,
          workspace_id: workspaceId,
        },
        { onConflict: 'email,workspace_id' }
      )
      .select('id')
      .single();

    if (!contact) return;

    // Insert open event
    await supabaseAdmin.from('email_events').insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      contact_email: contactEmail,
      campaign_name: campaign,
      email_number: step,
      event_type: 'opened',
      metadata: {
        token,
        user_agent: 'email_client',
        tracked_at: new Date().toISOString(),
      },
    });

    /* eslint-disable-next-line no-console */
    console.log(`[OPEN TRACKED] ${contactEmail} - Campaign: ${campaign}, Step: ${step}`);
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[OPEN TRACKING ERROR]', error);
  }
}
