import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, getWorkspaceId } from './supabase';

// ============================================
// RESPONSE HELPERS
// ============================================

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

export function jsonResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: API_HEADERS });
}

export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: API_HEADERS });
}

export function serverError(error: unknown): NextResponse {
  console.error('Server error:', error);
  return errorResponse('Internal server error', 500);
}

// ============================================
// REQUEST PARSING
// ============================================

export function getSearchParams(req: NextRequest): URLSearchParams {
  return new URL(req.url).searchParams;
}

export function parseParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  
  const result = schema.safeParse(obj);
  
  if (!result.success) {
    return {
      success: false,
      response: errorResponse(result.error.errors.map(e => e.message).join(', ')),
    };
  }
  
  return { success: true, data: result.data };
}

// ============================================
// DATE HELPERS
// ============================================

export function getDefaultDateRange(daysBack = 30): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString().slice(0, 10);
  return { startDate, endDate };
}

export function parseDateRange(
  start: string | undefined | null,
  end: string | undefined | null,
  defaultDays = 30
): { startDate: string; endDate: string } {
  const defaults = getDefaultDateRange(defaultDays);
  return {
    startDate: start || defaults.startDate,
    endDate: end || defaults.endDate,
  };
}

// ============================================
// SUPABASE CHECK
// ============================================

export function requireSupabase(): 
  | { available: true; client: NonNullable<typeof supabaseAdmin> }
  | { available: false; response: NextResponse } {
  if (!supabaseAdmin) {
    return {
      available: false,
      response: errorResponse('Database not configured', 503),
    };
  }
  return { available: true, client: supabaseAdmin };
}

// ============================================
// WORKSPACE HELPERS
// ============================================

export function getWorkspaceFromParams(searchParams: URLSearchParams): string {
  return getWorkspaceId(searchParams.get('workspace_id'));
}

// ============================================
// WEBHOOK AUTH
// ============================================

const WEBHOOK_TOKEN = process.env.WEBHOOK_SECRET || process.env.INGESTION_TOKEN;

export function validateWebhookToken(req: NextRequest): boolean {
  const token = req.headers.get('x-webhook-token') || 
                req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!WEBHOOK_TOKEN) {
    console.warn('No webhook token configured - allowing all requests');
    return true;
  }
  
  return token === WEBHOOK_TOKEN;
}

export function requireWebhookAuth(req: NextRequest): 
  | { authorized: true }
  | { authorized: false; response: NextResponse } {
  if (!validateWebhookToken(req)) {
    return {
      authorized: false,
      response: errorResponse('Unauthorized', 401),
    };
  }
  return { authorized: true };
}

