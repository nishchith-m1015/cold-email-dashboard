import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// GET /api/cache - Get cache statistics
export async function GET() {
  const stats = cacheManager.stats();
  
  return NextResponse.json({
    success: true,
    ...stats,
    message: `Cache has ${stats.validEntries} valid entries`,
  });
}

// POST /api/cache - Manage cache (clear, invalidate, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'stats', key, prefix } = body;

    switch (action) {
      case 'clear':
      case 'invalidate-all': {
        const count = cacheManager.invalidateAll();
        return NextResponse.json({
          success: true,
          action: 'invalidate-all',
          entriesCleared: count,
          message: `Cleared ${count} cache entries`,
        });
      }

      case 'invalidate': {
        if (!key) {
          return NextResponse.json(
            { error: 'Missing "key" parameter for invalidate action' },
            { status: 400 }
          );
        }
        const existed = cacheManager.invalidate(key);
        return NextResponse.json({
          success: true,
          action: 'invalidate',
          key,
          existed,
          message: existed ? `Invalidated cache key "${key}"` : `Key "${key}" was not in cache`,
        });
      }

      case 'invalidate-prefix': {
        if (!prefix) {
          return NextResponse.json(
            { error: 'Missing "prefix" parameter for invalidate-prefix action' },
            { status: 400 }
          );
        }
        const count = cacheManager.invalidatePrefix(prefix);
        return NextResponse.json({
          success: true,
          action: 'invalidate-prefix',
          prefix,
          entriesCleared: count,
          message: `Cleared ${count} cache entries with prefix "${prefix}"`,
        });
      }

      case 'stats':
      default: {
        const stats = cacheManager.stats();
        return NextResponse.json({
          success: true,
          action: 'stats',
          ...stats,
        });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON body', details: String(error) },
      { status: 400 }
    );
  }
}

// DELETE /api/cache - Clear all cache (convenience method)
export async function DELETE() {
  const count = cacheManager.invalidateAll();
  
  return NextResponse.json({
    success: true,
    entriesCleared: count,
    message: `Cleared ${count} cache entries`,
  });
}

