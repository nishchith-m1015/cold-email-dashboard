import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { extractWorkspaceId } from '@/lib/api-workspace-guard';
import { getAskKey } from '@/lib/ask-key-store';

export const dynamic = 'force-dynamic';

type Provider = 'openai' | 'openrouter';

async function fetchModels(provider: Provider, apiKey: string, referer?: string) {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to fetch OpenAI models');
    }
    const data = await res.json();
    const models = (data?.data || [])
      .map((m: any) => m.id as string)
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));
    return models;
  }

  // OpenRouter
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (referer) headers['HTTP-Referer'] = referer;
  headers['X-Title'] = 'Cold Email Dashboard';

  const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to fetch OpenRouter models');
  }
  const data = await res.json();
  const models = (data?.data || [])
    .map((m: any) => m.id as string)
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b));
  return models;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providerParam = new URL(req.url).searchParams.get('provider');
  const provider: Provider = providerParam === 'openrouter' ? 'openrouter' : 'openai';
  const workspaceId = extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;

  // Allow an explicit header override (user-provided key) for fetching models, else stored/encrypted, else env.
  const headerKey = req.headers.get('x-openai-key')?.trim();
  const stored = await getAskKey({ userId, workspaceId, provider });

  const apiKey =
    headerKey ||
    stored.apiKey ||
    (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.OPENROUTER_API_KEY) ||
    '';

  if (!apiKey) {
    return NextResponse.json(
      { error: `No ${provider} key available. Add a key to list models.` },
      { status: 400 }
    );
  }

  try {
    const referer = process.env.NEXT_PUBLIC_APP_URL;
    const models = await fetchModels(provider, apiKey, referer);
    // Include a few recommended defaults at the top
    const recommended =
      provider === 'openai'
        ? ['gpt-4o', 'gpt-4.1', 'gpt-4o-mini', 'gpt-3.5-turbo']
        : ['openrouter/auto', 'google/gemini-pro-1.5', 'mistralai/mistral-large', 'anthropic/claude-3-opus'];
    const unique = Array.from(new Set([...recommended, ...models]));
    return NextResponse.json({ models: unique, provider });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

