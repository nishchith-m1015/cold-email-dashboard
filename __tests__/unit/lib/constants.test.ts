/**
 * Unit Tests: lib/constants.ts
 * 
 * Tests for LLM pricing calculations and model name mapping:
 * - calculateLlmCost (exact match, fuzzy match, edge cases)
 * - getProviderColor (color mapping)
 * - getModelDisplayName (name normalization)
 */

import {
  calculateLlmCost,
  getProviderColor,
  getModelDisplayName,
  LLM_PRICING,
  CHART_COLORS,
} from '@/lib/constants';

describe('lib/constants.ts', () => {
  describe('calculateLlmCost', () => {
    describe('OpenAI models', () => {
      it('calculates GPT-4o cost correctly', () => {
        // GPT-4o: $0.0025 input, $0.01 output per 1K tokens
        // 1000 input + 500 output = (1000/1000 * 0.0025) + (500/1000 * 0.01)
        // = 0.0025 + 0.005 = 0.0075
        const cost = calculateLlmCost('openai', 'gpt-4o', 1000, 500);
        expect(cost).toBeCloseTo(0.0075, 4);
      });

      it('calculates GPT-4o Mini cost correctly', () => {
        // GPT-4o Mini: $0.00015 input, $0.0006 output per 1K tokens
        // 10000 input + 5000 output
        const cost = calculateLlmCost('openai', 'gpt-4o-mini', 10000, 5000);
        expect(cost).toBeCloseTo(0.0015 + 0.003, 4); // 0.0045
      });

      it('calculates o3-mini cost correctly', () => {
        // o3-mini: $0.0011 input, $0.0044 output per 1K tokens
        const cost = calculateLlmCost('openai', 'o3-mini', 2000, 1000);
        expect(cost).toBeCloseTo(0.0022 + 0.0044, 4); // 0.0066
      });
    });

    describe('Anthropic models', () => {
      it('calculates Claude Sonnet 4.5 cost correctly', () => {
        // Sonnet 4.5: $0.003 input, $0.015 output per 1K tokens
        const cost = calculateLlmCost('anthropic', 'claude-sonnet-4-5', 1000, 500);
        expect(cost).toBeCloseTo(0.003 + 0.0075, 4); // 0.0105
      });

      it('calculates Claude Haiku cost correctly', () => {
        // Haiku 3: $0.00025 input, $0.00125 output per 1K tokens
        const cost = calculateLlmCost('anthropic', 'claude-3-haiku', 10000, 5000);
        expect(cost).toBeCloseTo(0.0025 + 0.00625, 4); // 0.00875
      });

      it('calculates Claude Opus 4.5 cost correctly', () => {
        // Opus 4.5: $0.005 input, $0.025 output per 1K tokens
        const cost = calculateLlmCost('anthropic', 'claude-opus-4.5', 1000, 1000);
        expect(cost).toBeCloseTo(0.005 + 0.025, 4); // 0.03
      });
    });

    describe('Fuzzy model matching', () => {
      it('matches versioned model names', () => {
        // "o3-mini-2025-01-31" should match "o3-mini"
        const cost = calculateLlmCost('openai', 'o3-mini-2025-01-31', 1000, 1000);
        expect(cost).toBeGreaterThan(0);
        expect(cost).toBeCloseTo(0.0011 + 0.0044, 4); // Same as o3-mini
      });

      it('matches model names with different casing', () => {
        // Fuzzy matching is case-insensitive
        const cost1 = calculateLlmCost('openai', 'GPT-4O', 1000, 1000);
        const cost2 = calculateLlmCost('openai', 'gpt-4o', 1000, 1000);
        expect(cost1).toBeCloseTo(cost2, 4);
      });

      it('matches partial model names', () => {
        // "claude-sonnet-4-5-20250929" should match "claude-sonnet-4-5"
        const cost = calculateLlmCost('anthropic', 'claude-sonnet-4-5-20250929', 1000, 1000);
        expect(cost).toBeGreaterThan(0);
      });
    });

    describe('Edge cases', () => {
      it('returns 0 for unknown provider', () => {
        const cost = calculateLlmCost('unknown-provider', 'gpt-4', 1000, 1000);
        expect(cost).toBe(0);
      });

      it('returns 0 for unknown model', () => {
        const cost = calculateLlmCost('openai', 'unknown-model-xyz', 1000, 1000);
        expect(cost).toBe(0);
      });

      it('handles zero tokens', () => {
        const cost = calculateLlmCost('openai', 'gpt-4o', 0, 0);
        expect(cost).toBe(0);
      });

      it('handles zero input tokens only', () => {
        const cost = calculateLlmCost('openai', 'gpt-4o', 0, 1000);
        expect(cost).toBeCloseTo(0.01, 4); // Only output cost
      });

      it('handles zero output tokens only', () => {
        const cost = calculateLlmCost('openai', 'gpt-4o', 1000, 0);
        expect(cost).toBeCloseTo(0.0025, 4); // Only input cost
      });

      it('handles large token counts', () => {
        // 1 million input + 1 million output tokens
        const cost = calculateLlmCost('openai', 'gpt-4o', 1000000, 1000000);
        expect(cost).toBeCloseTo(2.5 + 10, 2); // $12.50 total
      });

      it('handles decimal token counts', () => {
        // Should work with non-integer tokens (though rare)
        const cost = calculateLlmCost('openai', 'gpt-4o', 1234.5, 567.8);
        expect(cost).toBeGreaterThan(0);
      });
    });

    describe('Pricing accuracy verification', () => {
      it('has correct pricing for all OpenAI models', () => {
        expect(LLM_PRICING.openai['o3-mini'].input).toBe(0.0011);
        expect(LLM_PRICING.openai['o3-mini'].output).toBe(0.0044);
        expect(LLM_PRICING.openai['gpt-4o'].input).toBe(0.0025);
        expect(LLM_PRICING.openai['gpt-4o'].output).toBe(0.01);
        expect(LLM_PRICING.openai['gpt-4o-mini'].input).toBe(0.00015);
        expect(LLM_PRICING.openai['gpt-4o-mini'].output).toBe(0.0006);
      });

      it('has correct pricing for all Anthropic models', () => {
        expect(LLM_PRICING.anthropic['claude-sonnet-4-5'].input).toBe(0.003);
        expect(LLM_PRICING.anthropic['claude-sonnet-4-5'].output).toBe(0.015);
        expect(LLM_PRICING.anthropic['claude-haiku-4.5'].input).toBe(0.001);
        expect(LLM_PRICING.anthropic['claude-haiku-4.5'].output).toBe(0.005);
      });
    });
  });

  describe('getProviderColor', () => {
    it('returns correct color for known providers', () => {
      expect(getProviderColor('openai')).toBe(CHART_COLORS.openai);
      expect(getProviderColor('anthropic')).toBe(CHART_COLORS.anthropic);
      expect(getProviderColor('google')).toBe(CHART_COLORS.google);
    });

    it('normalizes provider names (removes non-alpha chars)', () => {
      expect(getProviderColor('relevance-ai')).toBe(CHART_COLORS.relevance_ai);
      expect(getProviderColor('relevance ai')).toBe(CHART_COLORS.relevance_ai);
    });

    it('handles case insensitivity', () => {
      expect(getProviderColor('OpenAI')).toBe(CHART_COLORS.openai);
      expect(getProviderColor('ANTHROPIC')).toBe(CHART_COLORS.anthropic);
    });

    it('returns fallback color for unknown providers', () => {
      expect(getProviderColor('unknown-provider')).toBe(CHART_COLORS.unknown);
      expect(getProviderColor('random-xyz')).toBe(CHART_COLORS.unknown);
    });

    it('returns fallback for empty string', () => {
      expect(getProviderColor('')).toBe(CHART_COLORS.unknown);
    });
  });

  describe('getModelDisplayName', () => {
    it('returns user-friendly name for versioned models', () => {
      expect(getModelDisplayName('o3-mini-2025-01-31')).toBe('o3 Mini');
      expect(getModelDisplayName('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5');
    });

    it('returns user-friendly name for standard models', () => {
      expect(getModelDisplayName('gpt-4o')).toBe('GPT 4o');
      expect(getModelDisplayName('gpt-4o-mini')).toBe('GPT 4o Mini');
      expect(getModelDisplayName('o3-mini')).toBe('o3 Mini');
    });

    it('returns formatted name if no mapping exists', () => {
      // getModelDisplayName formats unknown models with title case
      expect(getModelDisplayName('unknown-model-xyz')).toBe('Unknown Model Xyz');
      expect(getModelDisplayName('custom-model-v2')).toBe('Custom Model V2');
    });

    it('handles special tool names', () => {
      expect(getModelDisplayName('linkedin_research_tool')).toBe('LinkedIn Research Tool');
      expect(getModelDisplayName('google-maps-reviews-scraper')).toBe('Reviews Scraper');
    });

    it('handles empty string', () => {
      expect(getModelDisplayName('')).toBe('');
    });

    it('formats model names (title case)', () => {
      // Model names are formatted with title case
      expect(getModelDisplayName('gpt-4o')).toBe('GPT 4o');
      expect(getModelDisplayName('GPT-4O')).toBe('GPT 4o'); // Normalized to lowercase 'o'
    });
  });

  describe('CHART_COLORS constant', () => {
    it('has all required event colors', () => {
      expect(CHART_COLORS.sends).toBeDefined();
      expect(CHART_COLORS.replies).toBeDefined();
      expect(CHART_COLORS.optOuts).toBeDefined();
      expect(CHART_COLORS.bounces).toBeDefined();
      expect(CHART_COLORS.cost).toBeDefined();
    });

    it('has all required provider colors', () => {
      expect(CHART_COLORS.openai).toBeDefined();
      expect(CHART_COLORS.anthropic).toBeDefined();
      expect(CHART_COLORS.google).toBeDefined();
      expect(CHART_COLORS.unknown).toBeDefined();
    });

    it('uses valid hex colors', () => {
      // All colors should be hex format (#RRGGBB)
      Object.values(CHART_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
