/**
 * PHASE 33 - Templates API
 * 
 * GET /api/templates
 * 
 * Returns available workflow templates for campaign creation.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'public, max-age=300', // 5 min cache for templates
  'Content-Type': 'application/json',
};

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
}

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  const { data: templates, error } = await supabaseAdmin
    .from('workflow_templates')
    .select('id, name, description, category, icon')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500, headers: API_HEADERS }
    );
  }

  return NextResponse.json({
    templates: templates || [],
    count: templates?.length || 0,
  }, { headers: API_HEADERS });
}
