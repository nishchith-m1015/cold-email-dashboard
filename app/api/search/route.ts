import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

interface SearchResult {
  type: 'contact' | 'campaign' | 'metric';
  id: string;
  title: string;
  subtitle: string;
  url?: string;
  highlight?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

/**
 * GET /api/search?query=...&types=contact,campaign&limit=20
 * Global search across contacts, campaigns, and metrics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Workspace access validation
    const accessError = await validateWorkspaceAccess(req, searchParams);
    if (accessError) {
      return accessError;
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    const query = searchParams.get('query')?.toLowerCase().trim();
    const typesParam = searchParams.get('types');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
      } as SearchResponse);
    }

    const types = typesParam ? typesParam.split(',') : ['contact', 'campaign'];
    const results: SearchResult[] = [];

    // Search contacts (from leads_ohio table)
    if (types.includes('contact')) {
      const { data: contacts } = await supabaseAdmin
        .from('leads_ohio')
        .select('id, first_name, last_name, email_address, company_name, job_title')
        .eq('workspace_id', workspaceId)
        .or(`email_address.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(Math.floor(limit / types.length));

      contacts?.forEach(contact => {
        const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
        results.push({
          type: 'contact',
          id: contact.id.toString(),
          title: fullName || contact.email_address || 'Unknown',
          subtitle: `${contact.email_address || ''} • ${contact.company_name || ''} • ${contact.job_title || ''}`.replace(/\s•\s•/g, ' •'),
          url: `/contacts/${contact.id}`,
          highlight: contact.email_address?.includes(query) ? contact.email_address : undefined,
        });
      });
    }

    // Search campaigns (from email_events - get unique campaign names)
    if (types.includes('campaign')) {
      const { data: campaigns } = await supabaseAdmin
        .from('email_events')
        .select('campaign_name')
        .eq('workspace_id', workspaceId)
        .ilike('campaign_name', `%${query}%`)
        .limit(Math.floor(limit / types.length));

      // Deduplicate campaign names
      const uniqueCampaigns = [...new Set(campaigns?.map(c => c.campaign_name) || [])];

      // Get stats for each campaign
      for (const campaignName of uniqueCampaigns) {
        const { data: stats } = await supabaseAdmin
          .from('email_events')
          .select('event_type')
          .eq('workspace_id', workspaceId)
          .eq('campaign_name', campaignName);

        const sends = stats?.filter(e => e.event_type === 'sent').length || 0;
        const replies = stats?.filter(e => e.event_type === 'replied').length || 0;

        results.push({
          type: 'campaign',
          id: campaignName,
          title: campaignName,
          subtitle: `${sends} sends • ${replies} replies`,
          url: `/?campaign=${encodeURIComponent(campaignName)}`,
          highlight: campaignName.toLowerCase().includes(query) ? campaignName : undefined,
        });
      }
    }

    // Search metrics (predefined list that matches query)
    if (types.includes('metric')) {
      const metrics = [
        { name: 'Reply Rate', url: '/', description: 'Track email reply performance' },
        { name: 'Opt-out Rate', url: '/', description: 'Monitor unsubscribe rates' },
        { name: 'Cost per Reply', url: '/', description: 'LLM cost efficiency' },
        { name: 'Monthly Projection', url: '/', description: 'Projected monthly spend' },
        { name: 'LLM Cost', url: '/analytics', description: 'AI/LLM usage costs' },
        { name: 'Campaign Performance', url: '/analytics', description: 'Campaign breakdown' },
        { name: 'Daily Sends', url: '/', description: 'Email sending volume' },
        { name: 'Sequence Breakdown', url: '/', description: 'Email sequence funnel' },
      ];

      metrics
        .filter(m => m.name.toLowerCase().includes(query) || m.description.toLowerCase().includes(query))
        .slice(0, 5)
        .forEach(metric => {
          results.push({
            type: 'metric',
            id: metric.name.toLowerCase().replace(/\s+/g, '-'),
            title: metric.name,
            subtitle: metric.description,
            url: metric.url,
            highlight: metric.name.toLowerCase().includes(query) ? metric.name : undefined,
          });
        });
    }

    // Sort by relevance (exact matches first, then partial)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query;
      const bExact = b.title.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = a.title.toLowerCase().startsWith(query);
      const bStarts = b.title.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return 0;
    });

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
    } as SearchResponse);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

