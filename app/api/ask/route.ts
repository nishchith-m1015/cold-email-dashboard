import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getSummary(workspaceId: string, start: string, end: string) {
  if (!supabaseAdmin) {
    return { sends: 0, replies: 0, opt_outs: 0, replyRatePct: 0, optOutRatePct: 0 };
  }

  const { data } = await supabaseAdmin
    .from('daily_stats')
    .select('sends, replies, opt_outs')
    .eq('workspace_id', workspaceId)
    .gte('day', start)
    .lte('day', end);

  const totals = (data || []).reduce(
    (acc, row) => ({
      sends: acc.sends + (row.sends || 0),
      replies: acc.replies + (row.replies || 0),
      opt_outs: acc.opt_outs + (row.opt_outs || 0),
    }),
    { sends: 0, replies: 0, opt_outs: 0 }
  );

  const replyRatePct = totals.sends > 0 ? (totals.replies / totals.sends) * 100 : 0;
  const optOutRatePct = totals.sends > 0 ? (totals.opt_outs / totals.sends) * 100 : 0;

  return { 
    ...totals, 
    replyRatePct: Number(replyRatePct.toFixed(2)), 
    optOutRatePct: Number(optOutRatePct.toFixed(2)) 
  };
}

async function getCosts(workspaceId: string, start: string, end: string) {
  if (!supabaseAdmin) return 0;
  
  const { data } = await supabaseAdmin
    .from('llm_usage')
    .select('cost_usd')
    .eq('workspace_id', workspaceId)
    .gte('created_at', `${start}T00:00:00Z`)
    .lte('created_at', `${end}T23:59:59Z`);

  const total = (data || []).reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0);
  return Number(total.toFixed(2));
}

export async function POST(req: NextRequest) {
  const workspaceId = DEFAULT_WORKSPACE_ID;
  
  let question = '';
  try {
    const body = await req.json();
    question = body.question || '';
  } catch {
    // Ignore parse errors
  }

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Current week (last 7 days)
  const end = fmt(today);
  const start = fmt(new Date(today.getTime() - 7 * 24 * 3600 * 1000));
  
  // Previous week
  const prevEnd = fmt(new Date(today.getTime() - 8 * 24 * 3600 * 1000));
  const prevStart = fmt(new Date(today.getTime() - 15 * 24 * 3600 * 1000));

  try {
    const [cur, prev, curCost, prevCost] = await Promise.all([
      getSummary(workspaceId, start, end),
      getSummary(workspaceId, prevStart, prevEnd),
      getCosts(workspaceId, start, end),
      getCosts(workspaceId, prevStart, prevEnd),
    ]);

    const replyDelta = cur.replyRatePct - prev.replyRatePct;
    const optOutDelta = cur.optOutRatePct - prev.optOutRatePct;
    const costDelta = curCost - prevCost;

    // Simple template-based response (can be replaced with actual LLM later)
    let answer = '';
    
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('reply') || questionLower.includes('response')) {
      answer = `📊 **Reply Rate Analysis**

**This Week (${start} to ${end}):**
• Reply Rate: ${cur.replyRatePct}% (${cur.replies} replies from ${cur.sends} sends)

**Previous Week (${prevStart} to ${prevEnd}):**
• Reply Rate: ${prev.replyRatePct}% (${prev.replies} replies from ${prev.sends} sends)

**Change:** ${replyDelta >= 0 ? '+' : ''}${replyDelta.toFixed(2)} percentage points

${replyDelta > 0 ? '✅ Your reply rate improved this week!' : replyDelta < 0 ? '⚠️ Reply rate decreased. Consider reviewing your email copy or targeting.' : 'Reply rate remained stable.'}`;
    } else if (questionLower.includes('opt') || questionLower.includes('unsubscribe')) {
      answer = `📊 **Opt-Out Rate Analysis**

**This Week (${start} to ${end}):**
• Opt-Out Rate: ${cur.optOutRatePct}% (${cur.opt_outs} opt-outs from ${cur.sends} sends)

**Previous Week (${prevStart} to ${prevEnd}):**
• Opt-Out Rate: ${prev.optOutRatePct}% (${prev.opt_outs} opt-outs from ${prev.sends} sends)

**Change:** ${optOutDelta >= 0 ? '+' : ''}${optOutDelta.toFixed(2)} percentage points

${optOutDelta < 0 ? '✅ Fewer opt-outs this week!' : optOutDelta > 0 ? '⚠️ Opt-outs increased. Review your messaging or list quality.' : 'Opt-out rate remained stable.'}`;
    } else if (questionLower.includes('cost') || questionLower.includes('spend') || questionLower.includes('llm')) {
      answer = `💰 **LLM Cost Analysis**

**This Week (${start} to ${end}):**
• Total LLM Cost: $${curCost.toFixed(2)}

**Previous Week (${prevStart} to ${prevEnd}):**
• Total LLM Cost: $${prevCost.toFixed(2)}

**Change:** ${costDelta >= 0 ? '+' : '-'}$${Math.abs(costDelta).toFixed(2)}

${costDelta < 0 ? '✅ You spent less on LLM this week!' : costDelta > 0 ? '📈 LLM costs increased, likely due to higher volume.' : 'LLM costs remained stable.'}`;
    } else {
      // General summary
      answer = `📊 **Weekly Performance Summary**

**This Week (${start} to ${end}):**
• Sends: ${cur.sends.toLocaleString()}
• Replies: ${cur.replies} (${cur.replyRatePct}% rate)
• Opt-Outs: ${cur.opt_outs} (${cur.optOutRatePct}% rate)
• LLM Cost: $${curCost.toFixed(2)}

**Week-over-Week Changes:**
• Reply Rate: ${replyDelta >= 0 ? '+' : ''}${replyDelta.toFixed(2)}pp
• Opt-Out Rate: ${optOutDelta >= 0 ? '+' : ''}${optOutDelta.toFixed(2)}pp
• LLM Cost: ${costDelta >= 0 ? '+' : '-'}$${Math.abs(costDelta).toFixed(2)}

💡 **Tip:** Ask me about specific metrics like "How did reply rates change?" or "What's my LLM spend?"`;
    }

    return NextResponse.json({ answer }, { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    console.error('Ask API error:', error);
    return NextResponse.json({ 
      answer: 'Sorry, I encountered an error fetching your data. Please ensure your database is connected properly.' 
    }, { headers: { 'content-type': 'application/json' } });
  }
}
