import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Refresh Materialized Views Endpoint
 * 
 * This endpoint triggers a refresh of all dashboard materialized views.
 * Should be called:
 * - Via cron job (every 5 minutes recommended)
 * - After bulk data imports
 * - When real-time data is critical
 * 
 * Usage:
 * POST /api/admin/refresh-views
 * Headers:
 *   x-refresh-token: <MATERIALIZED_VIEWS_REFRESH_TOKEN>
 */
export async function POST(request: NextRequest) {
  try {
    // Verify token
    const token = request.headers.get('x-refresh-token');
    const expectedToken = process.env.MATERIALIZED_VIEWS_REFRESH_TOKEN;

    if (!expectedToken) {
      console.warn('MATERIALIZED_VIEWS_REFRESH_TOKEN not configured');
      return NextResponse.json(
        { error: 'Refresh endpoint not configured' },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Call the refresh function
    const startTime = Date.now();
    const { data, error } = await supabaseAdmin.rpc('refresh_dashboard_views');

    if (error) {
      console.error('Failed to refresh views:', error);
      return NextResponse.json(
        { 
          error: 'Failed to refresh views',
          details: error.message,
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    // Get freshness info
    const { data: freshnessData } = await supabaseAdmin.rpc('get_view_freshness');

    return NextResponse.json({
      success: true,
      refreshed_at: new Date().toISOString(),
      duration_ms: duration,
      views: data,
      freshness: freshnessData,
    });

  } catch (error) {
    console.error('Refresh views error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get View Freshness Info
 * 
 * GET /api/admin/refresh-views
 * Returns the age of each materialized view
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc('get_view_freshness');

    if (error) {
      console.error('Failed to get freshness:', error);
      return NextResponse.json(
        { error: 'Failed to get view freshness' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      views: data,
      checked_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get freshness error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
