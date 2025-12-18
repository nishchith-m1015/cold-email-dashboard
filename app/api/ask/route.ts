import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { buildRAGContext, formatContextForPrompt } from '@/lib/rag-context';
import { extractWorkspaceId, canAccessWorkspace } from '@/lib/api-workspace-guard';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getAskKey } from '@/lib/ask-key-store';

export const dynamic = 'force-dynamic';

interface AskRequest {
  question: string;
  context?: {
    start_date: string;
    end_date: string;
    campaign?: string;
  };
  stream?: boolean;
  provider?: 'openai' | 'openrouter';
  model?: string;
}

interface AskResponse {
  answer: string;
  sources?: Array<{
    type: 'metric' | 'chart' | 'contact' | 'campaign';
    label: string;
    value: string | number;
  }>;
  suggested_followups?: string[];
}

/**
 * POST /api/ask
 * RAG-powered AI assistant using GPT-4o
 */
function parseDateIntent(question: string): { start: string; end: string } | null {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const lower = question.toLowerCase();

  const setRange = (start: Date, end: Date) => ({ start: fmt(start), end: fmt(end) });

  if (/last\s+7\s+days|past\s+7\s+days|past\s+week|last\s+week/.test(lower)) {
    const end = now;
    const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
    return setRange(start, end);
  }
  if (/last\s+30\s+days|past\s+30\s+days|last\s+month|past\s+month/.test(lower)) {
    const end = now;
    const start = new Date(end.getTime() - 29 * 24 * 3600 * 1000);
    return setRange(start, end);
  }
  if (/yesterday/.test(lower)) {
    const end = new Date(now.getTime() - 24 * 3600 * 1000);
    return setRange(end, end);
  }
  if (/today|current\s+day/.test(lower)) {
    return setRange(now, now);
  }
  if (/this\s+month|current\s+month/.test(lower)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return setRange(start, now);
  }
  if (/last\s+90\s+days|past\s+90\s+days|quarter|last\s+quarter/.test(lower)) {
    const end = now;
    const start = new Date(end.getTime() - 89 * 24 * 3600 * 1000);
    return setRange(start, end);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { answer: 'Please sign in to use the AI assistant.' },
        { status: 401 }
      );
    }

    // Workspace validation
    const workspaceId = extractWorkspaceId(req) || DEFAULT_WORKSPACE_ID;
    const { hasAccess } = await canAccessWorkspace(userId, workspaceId);
    
    if (!hasAccess) {
      return NextResponse.json(
        { answer: 'Access denied to this workspace.' },
        { status: 403 }
      );
    }

    const body: AskRequest = await req.json();
    const question = body.question?.trim();

    if (!question || question.length < 3) {
      return NextResponse.json({
        answer: 'Please ask a question about your dashboard data.',
      } as AskResponse);
    }

    // Get date range from context, date intent, or use last 30 days (wider default)
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const intentRange = question ? parseDateIntent(question) : null;
    const endDate = body.context?.end_date || intentRange?.end || fmt(today);
    const startDate =
      body.context?.start_date ||
      intentRange?.start ||
      fmt(new Date(today.getTime() - 30 * 24 * 3600 * 1000));
    const campaign = body.context?.campaign;

    // Rate limit (20 requests per hour per user)
    const rl = checkRateLimit(`ask:${userId}`, { limit: 20, windowSec: 3600 });
    if (!rl.success) {
      return NextResponse.json(
        { answer: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Build RAG context
    const ragContext = await buildRAGContext(workspaceId, startDate, endDate, campaign);
    const contextPrompt = formatContextForPrompt(ragContext);

    // Resolve provider and API key (Pillar 4: Ephemeral Runtime)
    // Keys are decrypted JIT and used immediately - no persistent storage
    const provider = body.provider === 'openrouter' ? 'openrouter' : 'openai';
    // Pillar 5: Anti-Leak Mesh - ONLY use vault keys or explicit header overrides.
    // DO NOT fall back to server-side environment variables to prevent cross-tenant leakage.
    const clientApiKey = req.headers.get('x-openai-key')?.trim();
    const stored = await getAskKey({ userId, workspaceId, provider });

    const openaiKey = provider === 'openai' ? (clientApiKey || stored.apiKey) : null;
    const openrouterKey = provider === 'openrouter' ? (clientApiKey || stored.apiKey) : null;

    if (provider === 'openai' && !openaiKey) {
      return NextResponse.json({
        answer: 'AI assistant is not configured. Provide an OpenAI key or configure it in settings.',
      } as AskResponse, { status: 400, headers: rateLimitHeaders(rl) });
    }

    if (provider === 'openrouter' && !openrouterKey) {
      return NextResponse.json({
        answer: 'AI assistant is not configured. Provide an OpenRouter key or configure it in settings.',
      } as AskResponse, { status: 400, headers: rateLimitHeaders(rl) });
    }

    const systemPrompt = `You are a helpful analytics assistant for a cold email dashboard. 
You have access to real-time campaign data and should provide clear, actionable insights.
Reply in clean, readable markdown. Never return JSON, tables, or code blocks. Keep responses tight but informative.

Response format:
- Title line (plain text, no markdown heading)
- 4–7 bullet points with short sentences
- Emphasize key metrics with commas for thousands and % with 1–2 decimals
- If giving recommendations, prefix with "Improve:" and keep to 1–2 bullets

Style rules:
- No tables, no JSON, no code fences
- Max 1 short paragraph if needed; prefer bullets
- Be specific and data-driven; avoid filler

Current dashboard data:
${contextPrompt}

User's timezone: UTC (all times in UTC)`;

    const useStream = body.stream === true;
    const model =
      (body.model as string | undefined)?.trim() ||
      (provider === 'openai' ? 'gpt-4o' : 'gpt-4o');

    const isOpenRouter = provider === 'openrouter';
    const url = isOpenRouter
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    // Build an app URL for referrer (OpenRouter requires this)
    const envAppUrls = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URLS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const requestProto = req.headers.get('x-forwarded-proto') || 'https';
    const requestHost = req.headers.get('host') || '';
    const derivedHostUrl = requestHost ? `${requestProto}://${requestHost}` : undefined;
    const appUrl = envAppUrls[0] || derivedHostUrl;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${isOpenRouter ? openrouterKey! : openaiKey!}`,
    };

    if (isOpenRouter) {
      // Required by OpenRouter policy
      if (appUrl) {
        headers['HTTP-Referer'] = appUrl;
      }
      headers['X-Title'] = 'Cold Email Dashboard';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: useStream,
      }),
    });

    if (useStream) {
      if (!response.ok) {
        const errText = await response.text();
      console.error('AI API error (stream):', errText);
        return NextResponse.json(
          { answer: 'Sorry, I encountered an error processing your question. Please try again.' },
          { status: 500, headers: rateLimitHeaders(rl) }
        );
      }
      // Stream raw text back to client
      if (!response.body) {
        return NextResponse.json(
          { answer: 'Streaming is not available. Please retry without streaming.' },
          { status: 500, headers: rateLimitHeaders(rl) }
        );
      }
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          ...rateLimitHeaders(rl),
        },
      });
    }

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return NextResponse.json({
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
      } as AskResponse, { status: 500, headers: rateLimitHeaders(rl) });
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'No response generated.';

    // Extract sources from context
    const sources = [
      { type: 'metric' as const, label: 'Reply Rate', value: `${ragContext.summary.reply_rate_pct}%` },
      { type: 'metric' as const, label: 'Total Sends', value: ragContext.summary.sends },
      { type: 'metric' as const, label: 'LLM Cost', value: `$${ragContext.summary.cost_usd.toFixed(2)}` },
    ];

    // Generate suggested follow-ups based on the data
    const followups: string[] = [];
    
    if (ragContext.summary.reply_rate_pct < 2) {
      followups.push('Why is my reply rate low?');
    }
    if (ragContext.summary.opt_out_rate_pct > 2) {
      followups.push('How can I reduce opt-outs?');
    }
    if (ragContext.topCampaigns.length > 1) {
      followups.push('Which campaign is performing best?');
    }
    if (ragContext.summary.cost_usd > 10) {
      followups.push('How can I reduce my LLM costs?');
    }
    followups.push('What are the trends this week?');

    return NextResponse.json({
      answer,
      sources,
      suggested_followups: followups.slice(0, 3),
    } as AskResponse, { headers: rateLimitHeaders(rl) });

  } catch (error) {
    // Pillar 4: Error handling without exposing sensitive data
    // Generate error ID for correlation (never log keys or sensitive data)
    const errorId = crypto.randomUUID().split('-')[0];
    console.error(JSON.stringify({
      event: 'ask_api_error',
      errorId,
      timestamp: new Date().toISOString(),
      // NO sensitive data logged
    }));
    
    return NextResponse.json({
      answer: 'Sorry, I encountered an unexpected error. Please try again later.',
      errorId, // For support correlation
    } as AskResponse & { errorId: string }, { status: 500 });
  }
}
