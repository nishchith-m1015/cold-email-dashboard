import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check if Supabase is configured - if not, return Google Sheets campaign
  if (!supabaseAdmin) {
    // Return Ohio campaign from Google Sheets
    return NextResponse.json({
      campaigns: [{ name: 'Ohio' }],
      source: 'google_sheets',
    }, { headers: { 'content-type': 'application/json' } });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  try {
    // Get unique campaign names from daily_stats
    const { data, error } = await supabaseAdmin
      .from('daily_stats')
      .select('campaign_name')
      .eq('workspace_id', workspaceId)
      .not('campaign_name', 'is', null);

    if (error) {
      console.error('Campaigns query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract unique campaign names
    const campaignSet = new Set<string>();
    for (const row of data || []) {
      if (row.campaign_name) {
        campaignSet.add(row.campaign_name);
      }
    }

    const campaigns = Array.from(campaignSet)
      .map(name => ({ name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      campaigns,
    }, { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    console.error('Campaigns API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

