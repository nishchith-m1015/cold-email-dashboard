import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side admin client (uses service role key)
// Returns null if env vars are not set (e.g., during build)
function createSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseAdmin = createSupabaseAdmin();

// Default workspace ID for single-tenant mode
// IMPORTANT: This must match the schema default in schema.sql
export const DEFAULT_WORKSPACE_ID = 'default';

// Type definitions for database tables
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  linkedin_url: string | null;
  created_at: string;
}

export interface EmailEvent {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  campaign_id: string | null;
  contact_email: string;
  campaign_name: string | null;
  step: number | null;
  event_type: 'sent' | 'delivered' | 'bounced' | 'replied' | 'opt_out';
  event_ts: string;
  provider: string | null;
  provider_message_id: string | null;
  metadata: Record<string, unknown>;
  event_key: string | null;
  created_at: string;
}

export interface DailyStats {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  day: string;
  sends: number;
  replies: number;
  opt_outs: number;
  bounces: number;
}

export interface LlmUsage {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  contact_email: string | null;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  purpose: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProviderCostConfig {
  id: string;
  provider: string;
  model: string;
  price_per_1k_input: number;
  price_per_1k_output: number;
  effective_date: string;
  created_at: string;
}

