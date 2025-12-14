import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Get tracking parameters
  const destinationUrl = searchParams.get('url') || searchParams.get('u');
  const contactEmail = searchParams.get('e') || searchParams.get('email');
  const campaign = searchParams.get('c') || searchParams.get('campaign') || 'Unknown';
  const step = parseInt(searchParams.get('s') || searchParams.get('step') || '1', 10);
  const linkId = searchParams.get('l') || searchParams.get('link') || 'main_cta';
  const workspaceId = searchParams.get('w') || searchParams.get('workspace_id');
  
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id' }, { status: 400 });
  }
  
  // Validate destination URL
  if (!destinationUrl) {
    return NextResponse.json({ error: 'Missing destination URL' }, { status: 400 });
  }

  // Validate URL format
  let finalUrl: string;
  try {
    // Handle URL encoding
    const decodedUrl = decodeURIComponent(destinationUrl);
    new URL(decodedUrl); // Validate it's a proper URL
    finalUrl = decodedUrl;
  } catch {
    // If URL is malformed, redirect to a safe fallback
    /* eslint-disable-next-line no-console */
    console.error('[CLICK TRACKING] Invalid URL:', destinationUrl);
    return NextResponse.redirect('https://smartieagents.com');
  }

  // Track the click event asynchronously (don't block redirect)
  if (contactEmail && supabaseAdmin && workspaceId) {
    // Fire and forget
    trackClickEvent(contactEmail, campaign, step, linkId, finalUrl, workspaceId).catch(console.error);
  }

  // Redirect to the destination URL immediately
  return NextResponse.redirect(finalUrl);
}

async function trackClickEvent(
  contactEmail: string,
  campaign: string,
  step: number,
  linkId: string,
  destinationUrl: string,
  workspaceId: string
) {
  if (!supabaseAdmin) return;

  try {
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

    // Insert click event
    await supabaseAdmin.from('email_events').insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      contact_email: contactEmail,
      campaign_name: campaign,
      email_number: step,
      event_type: 'clicked',
      metadata: {
        link_id: linkId,
        destination_url: destinationUrl,
        tracked_at: new Date().toISOString(),
      },
    });

    /* eslint-disable-next-line no-console */
    console.log(`[CLICK TRACKED] ${contactEmail} - Campaign: ${campaign}, Step: ${step}, Link: ${linkId}`);
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error('[CLICK TRACKING ERROR]', error);
  }
}

