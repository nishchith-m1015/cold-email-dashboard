// LLM Pricing (per 1K tokens, as of November 2025)
// Pricing source: https://openrouter.ai/models
export const LLM_PRICING = {
  openai: {
    'o3-mini': { input: 0.00110, output: 0.00440 },
    'gpt-4o': { input: 0.00250, output: 0.01000 },
    'gpt-4o-mini': { input: 0.00015, output: 0.00060 },
  },
  anthropic: {
    'claude-sonnet-4-5': { input: 0.00300, output: 0.01500 },
    'claude-3-5-sonnet': { input: 0.00300, output: 0.01500 },
    'claude-opus-4.5': { input: 0.00500, output: 0.02500 },
    'claude-3-opus': { input: 0.01500, output: 0.07500 },
    'claude-haiku-4.5': { input: 0.00100, output: 0.00500 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  },
} as const;

// Calculate LLM cost with fuzzy model name matching
export function calculateLlmCost(
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const providerPricing = LLM_PRICING[provider as keyof typeof LLM_PRICING];
  if (!providerPricing) return 0;
  
  // Try exact match first
  let modelPricing = providerPricing[model as keyof typeof providerPricing] as { input: number; output: number } | undefined;
  
  // If no exact match, try fuzzy matching (e.g., 'o3-mini-2025-01-31' -> 'o3-mini')
  if (!modelPricing) {
    const modelKeys = Object.keys(providerPricing);
    const matchingKey = modelKeys.find(key => model.toLowerCase().includes(key.toLowerCase()));
    if (matchingKey) {
      modelPricing = providerPricing[matchingKey as keyof typeof providerPricing] as { input: number; output: number };
    }
  }
  
  if (!modelPricing) return 0;
  
  const inputCost = (tokensIn / 1000) * modelPricing.input;
  const outputCost = (tokensOut / 1000) * modelPricing.output;
  
  return inputCost + outputCost;
}

// Email providers
export const EMAIL_PROVIDERS = ['gmail', 'ses', 'mailgun', 'sendgrid', 'smtp'] as const;

// Event types
export const EVENT_TYPES = ['sent', 'delivered', 'bounced', 'replied', 'opt_out'] as const;

// Chart colors
export const CHART_COLORS = {
  sends: '#3b82f6',      // Blue
  replies: '#22c55e',    // Green
  optOuts: '#ef4444',    // Red
  bounces: '#f59e0b',    // Amber
  cost: '#8b5cf6',       // Purple
  openai: '#10a37f',     // OpenAI green
  anthropic: '#d97706',  // Anthropic amber
  google: '#4285f4',     // Google blue
  relevance_ai: '#6366f1', // Indigo
  apify: '#00d1b2',      // Teal
  unknown: '#94a3b8',    // Slate gray
};

// Get color for any provider (with fallback)
export function getProviderColor(provider: string): string {
  const normalizedProvider = provider.toLowerCase().replace(/[^a-z]/g, '_');
  return CHART_COLORS[normalizedProvider as keyof typeof CHART_COLORS] || CHART_COLORS.unknown;
}

// Default date ranges
export const DATE_RANGES = {
  '7d': { label: 'Last 7 days', days: 7 },
  '14d': { label: 'Last 14 days', days: 14 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
} as const;

