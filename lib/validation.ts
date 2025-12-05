import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const uuidSchema = z.string().uuid('Invalid UUID');

export const workspaceIdSchema = z.string().min(1, 'Workspace ID required');

export const emailSchema = z.string().email('Invalid email');

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const dateRangeSchema = z.object({
  start: dateSchema.optional(),
  end: dateSchema.optional(),
  campaign: z.string().optional(),
  workspace_id: workspaceIdSchema.optional(),
});

export const metricsQuerySchema = dateRangeSchema.extend({
  source: z.enum(['sheets', 'supabase']).optional(),
});

export const timeseriesQuerySchema = dateRangeSchema.extend({
  metric: z.enum([
    'sends', 'replies', 'opt_outs', 'bounces', 'clicks',
    'reply_rate', 'opt_out_rate', 'bounce_rate', 'click_rate'
  ]).default('sends'),
});

export const costBreakdownQuerySchema = dateRangeSchema.extend({
  provider: z.string().optional(),
});

export const senderQuerySchema = dateRangeSchema.extend({
  sender: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

// ============================================
// EVENT SCHEMAS
// ============================================

export const emailEventSchema = z.object({
  contact_email: emailSchema,
  campaign_name: z.string().min(1),
  event_type: z.enum(['sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked']),
  email_number: z.number().int().min(1).max(10).optional(),
  provider: z.string().optional(),
  provider_message_id: z.string().optional(),
  subject: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const costEventSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  tokens_in: z.number().int().min(0).optional().default(0),
  tokens_out: z.number().int().min(0).optional().default(0),
  cost_usd: z.number().min(0),
  campaign_name: z.string().optional(),
  contact_email: z.string().optional(),
  purpose: z.string().optional(),
  workflow_id: z.string().optional(),
  run_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// RESPONSE TYPES
// ============================================

export type DateRangeQuery = z.infer<typeof dateRangeSchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>;
export type CostBreakdownQuery = z.infer<typeof costBreakdownQuerySchema>;
export type SenderQuery = z.infer<typeof senderQuerySchema>;
export type EmailEvent = z.infer<typeof emailEventSchema>;
export type CostEvent = z.infer<typeof costEventSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export function parseSearchParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return schema.parse(obj);
}

export function safeParseSearchParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return schema.safeParse(obj);
}
