import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Admin API for managing LLM usage records
 * 
 * DELETE /api/admin/llm-usage
 * - Deletes records based on date criteria
 * - Requires x-webhook-token header for authentication
 * 
 * Request body:
 * - before: ISO date string - delete all records before this date
 * - after: ISO date string - delete all records after this date
 * - between: { start: string, end: string } - delete records in date range
 * - dryRun: boolean - if true, returns count without deleting
 */

export async function DELETE(req: NextRequest) {
  // Verify authentication
  const token = req.headers.get('x-webhook-token');
  const expectedToken = process.env.DASH_WEBHOOK_TOKEN;

  if (!token || token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing token' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { before, after, between, dryRun = false } = body;

    // Validate that at least one filter is provided
    if (!before && !after && !between) {
      return NextResponse.json(
        { error: 'Missing filter - provide "before", "after", or "between" date criteria' },
        { status: 400 }
      );
    }

    // Build the query
    let query = supabase.from('llm_usage').select('id', { count: 'exact' });

    if (before) {
      // Validate date format
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid "before" date format. Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      query = query.lt('created_at', before);
    }

    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid "after" date format. Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      query = query.gt('created_at', after);
    }

    if (between) {
      const { start, end } = between;
      if (!start || !end) {
        return NextResponse.json(
          { error: '"between" requires both "start" and "end" dates' },
          { status: 400 }
        );
      }
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format in "between". Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      query = query.gte('created_at', start).lte('created_at', end);
    }

    // First, count how many records would be affected
    const { count, error: countError } = await query;

    if (countError) {
      console.error('Error counting records:', countError);
      return NextResponse.json(
        { error: 'Failed to count records', details: countError.message },
        { status: 500 }
      );
    }

    // If dry run, just return the count
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        recordsToDelete: count,
        message: `Would delete ${count} record(s). Set dryRun: false to execute.`,
      });
    }

    // Actually delete the records
    let deleteQuery = supabase.from('llm_usage').delete();

    if (before) {
      deleteQuery = deleteQuery.lt('created_at', before);
    }
    if (after) {
      deleteQuery = deleteQuery.gt('created_at', after);
    }
    if (between) {
      deleteQuery = deleteQuery.gte('created_at', between.start).lte('created_at', between.end);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Error deleting records:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete records', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: count,
      message: `Successfully deleted ${count} LLM usage record(s)`,
      criteria: { before, after, between },
    });

  } catch (error) {
    console.error('Admin LLM usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to view records (useful for debugging)
export async function GET(req: NextRequest) {
  // Verify authentication
  const token = req.headers.get('x-webhook-token');
  const expectedToken = process.env.DASH_WEBHOOK_TOKEN;

  if (!token || token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing token' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const before = searchParams.get('before');
  const after = searchParams.get('after');

  try {
    let query = supabase
      .from('llm_usage')
      .select('id, provider, model, cost_usd, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }
    if (after) {
      query = query.gt('created_at', after);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch records', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      records: data,
    });

  } catch (error) {
    console.error('Admin LLM usage GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

