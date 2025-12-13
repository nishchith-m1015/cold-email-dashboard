import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { extractWorkspaceId } from '@/lib/api-workspace-guard';
import { deleteAskKey, getAskKeyStatus, setAskKey } from '@/lib/ask-key-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const workspaceId = extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;
  const status = await getAskKeyStatus({ userId, workspaceId });
  if (status.error) {
    return NextResponse.json({ error: status.error }, { status: 500 });
  }
  return NextResponse.json({
    openaiConfigured: status.openaiConfigured,
    openrouterConfigured: status.openrouterConfigured,
    hasEnvOpenAI: status.hasEnvOpenAI,
    hasEnvOpenRouter: status.hasEnvOpenRouter,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const workspaceId = extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai';
  const apiKey = (body.apiKey || '').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }
  const result = await setAskKey({ userId, workspaceId, provider, apiKey });
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to save key' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const workspaceId = extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;
  const providerParam = new URL(req.url).searchParams.get('provider');
  const provider = providerParam === 'openrouter' ? 'openrouter' : 'openai';
  const result = await deleteAskKey({ userId, workspaceId, provider });
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to delete key' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

