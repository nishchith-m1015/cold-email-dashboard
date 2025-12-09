import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { buildRAGContext, formatContextForPrompt } from '@/lib/rag-context';
import { extractWorkspaceId, canAccessWorkspace } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

interface AskRequest {
  question: string;
  context?: {
    start_date: string;
    end_date: string;
    campaign?: string;
  };
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

    // Get date range from context or use last 7 days
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const endDate = body.context?.end_date || fmt(today);
    const startDate = body.context?.start_date || fmt(new Date(today.getTime() - 7 * 24 * 3600 * 1000));
    const campaign = body.context?.campaign;

    // Build RAG context
    const ragContext = await buildRAGContext(workspaceId, startDate, endDate, campaign);
    const contextPrompt = formatContextForPrompt(ragContext);

    // Call OpenAI GPT-4o
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({
        answer: 'AI assistant is not configured. Please add OPENAI_API_KEY to your environment variables.',
      } as AskResponse);
    }

    const systemPrompt = `You are a helpful analytics assistant for a cold email dashboard. 
You have access to real-time campaign data and should provide clear, actionable insights.
Be concise and data-driven. Format numbers nicely (e.g., 1,234 instead of 1234).
Use bullet points for lists. When suggesting improvements, be specific.

Current dashboard data:
${contextPrompt}

User's timezone: UTC (all times in UTC)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return NextResponse.json({
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
      } as AskResponse);
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
    } as AskResponse);

  } catch (error) {
    console.error('Ask API error:', error);
    return NextResponse.json({
      answer: 'Sorry, I encountered an unexpected error. Please try again later.',
    } as AskResponse);
  }
}
