/**
 * Phase 32 Pillar 5: n8n Health Check API
 * HEAD /api/health/n8n
 * 
 * Checks if n8n service is reachable.
 */

import { NextResponse } from 'next/server';
import { isN8nConfigured } from '@/lib/n8n-client';

export const dynamic = 'force-dynamic';

export async function HEAD() {
  if (!isN8nConfigured()) {
    return new NextResponse(null, { status: 503 });
  }

  const baseUrl = process.env.N8N_BASE_URL || process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;

  try {
    const response = await fetch(`${baseUrl}/workflows?limit=1`, {
      method: 'HEAD',
      headers: { 'X-N8N-API-KEY': apiKey! },
      signal: AbortSignal.timeout(5000),
    });

    return new NextResponse(null, { status: response.ok ? 200 : 503 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
