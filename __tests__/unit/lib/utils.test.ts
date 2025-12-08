/**
 * Unit Tests: lib/utils.ts
 * 
 * Tests for utility functions including:
 * - Number formatting (formatNumber, formatCurrency, formatPercent)
 * - Date formatting (formatDate, toISODate, daysAgo)
 * - Calculations (percentChange)
 * - UI helpers (getTrendIndicator)
 */

import {
  formatNumber,
  formatCurrency,
  formatCurrencyShort,
  formatCurrencyPrecise,
  formatPercent,
  percentChange,
  formatDate,
  toISODate,
  daysAgo,
  getTrendIndicator,
  cn,
} from '@/lib/utils';

describe('lib/utils.ts', () => {
  describe('formatNumber', () => {
    it('formats integers with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(100)).toBe('100');
    });

    it('formats decimals when specified', () => {
      expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
      expect(formatNumber(1000.123, 1)).toBe('1,000.1');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(0, 2)).toBe('0.00');
    });

    it('handles negative numbers', () => {
      expect(formatNumber(-1234567)).toBe('-1,234,567');
      expect(formatNumber(-50.5, 2)).toBe('-50.50');
    });
  });

  describe('formatCurrency', () => {
    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('formats micro-costs (< $1) with 4 decimals', () => {
      expect(formatCurrency(0.0012)).toBe('$0.0012');
      expect(formatCurrency(0.5678)).toBe('$0.5678');
      expect(formatCurrency(-0.25)).toBe('$-0.2500');
    });

    it('formats regular amounts with 2 decimals', () => {
      expect(formatCurrency(123.456)).toBe('$123.46');
      expect(formatCurrency(1234.5)).toBe('$1,234.50');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('handles negative amounts', () => {
      expect(formatCurrency(-50.5)).toBe('-$50.50');
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    });

    it('formats large numbers correctly', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('formatCurrencyShort', () => {
    it('always formats with 2 decimals', () => {
      expect(formatCurrencyShort(0)).toBe('$0.00');
      expect(formatCurrencyShort(123.456)).toBe('$123.46');
      expect(formatCurrencyShort(0.0012)).toBe('$0.00'); // Rounds to 0
    });

    it('handles large amounts', () => {
      expect(formatCurrencyShort(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('formatCurrencyPrecise', () => {
    it('always formats with 4 decimals', () => {
      expect(formatCurrencyPrecise(0)).toBe('$0.0000');
      expect(formatCurrencyPrecise(0.0012)).toBe('$0.0012');
      expect(formatCurrencyPrecise(123.456789)).toBe('$123.4568');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages with default 2 decimals', () => {
      expect(formatPercent(12.345)).toBe('12.35%');
      expect(formatPercent(100)).toBe('100.00%');
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('formats percentages with custom decimals', () => {
      expect(formatPercent(12.345, 1)).toBe('12.3%');
      expect(formatPercent(12.345, 3)).toBe('12.345%');
      expect(formatPercent(12.345, 0)).toBe('12%');
    });

    it('handles negative percentages', () => {
      expect(formatPercent(-25.5)).toBe('-25.50%');
    });
  });

  describe('percentChange', () => {
    it('calculates positive percentage change', () => {
      expect(percentChange(150, 100)).toBe(50);
      expect(percentChange(200, 100)).toBe(100);
    });

    it('calculates negative percentage change', () => {
      expect(percentChange(75, 100)).toBe(-25);
      expect(percentChange(50, 100)).toBe(-50);
    });

    it('handles zero previous value', () => {
      expect(percentChange(100, 0)).toBe(100);
      expect(percentChange(0, 0)).toBe(0);
    });

    it('handles zero current value', () => {
      expect(percentChange(0, 100)).toBe(-100);
    });

    it('handles decimal changes', () => {
      expect(percentChange(105, 100)).toBe(5);
      expect(percentChange(99, 100)).toBe(-1);
    });
  });

  describe('formatDate', () => {
    it('formats Date object', () => {
      const date = new Date('2025-01-15');
      const formatted = formatDate(date);
      // Match format: "Jan 15, 2025"
      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it('formats date string', () => {
      const formatted = formatDate('2025-12-08');
      expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });
  });

  describe('toISODate', () => {
    it('formats date in YYYY-MM-DD format', () => {
      // Use UTC date to avoid timezone issues
      const date = new Date(Date.UTC(2025, 0, 5)); // Jan 5, 2025 UTC
      const result = toISODate(date);
      // Should be formatted as YYYY-MM-DD (may vary by timezone)
      expect(result).toMatch(/2025-01-(04|05)/); // Accept either due to timezone
    });

    it('pads single-digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025 (month is 0-indexed)
      expect(toISODate(date)).toBe('2025-01-05');
    });

    it('handles end of month', () => {
      const date = new Date(2025, 0, 31); // January 31, 2025
      expect(toISODate(date)).toBe('2025-01-31');
    });

    it('uses local date (no timezone shift)', () => {
      const date = new Date(2025, 11, 25); // December 25, 2025
      const result = toISODate(date);
      expect(result).toBe('2025-12-25');
    });
  });

  describe('daysAgo', () => {
    it('calculates date N days ago', () => {
      const today = new Date();
      const sevenDaysAgo = daysAgo(7);
      
      const diffTime = Math.abs(today.getTime() - sevenDaysAgo.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(7);
    });

    it('handles zero days', () => {
      const today = new Date();
      const result = daysAgo(0);
      
      // Should be same day
      expect(result.toDateString()).toBe(today.toDateString());
    });

    it('handles negative days (future)', () => {
      const today = new Date();
      const future = daysAgo(-7);
      
      const diffTime = Math.abs(future.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(7);
      expect(future > today).toBe(true);
    });
  });

  describe('getTrendIndicator', () => {
    it('returns up arrow for positive change', () => {
      const result = getTrendIndicator(10);
      expect(result.icon).toBe('↑');
      expect(result.color).toBe('text-accent-success');
    });

    it('returns down arrow for negative change', () => {
      const result = getTrendIndicator(-10);
      expect(result.icon).toBe('↓');
      expect(result.color).toBe('text-accent-danger');
    });

    it('returns right arrow for zero change', () => {
      const result = getTrendIndicator(0);
      expect(result.icon).toBe('→');
      expect(result.color).toBe('text-text-secondary');
    });

    it('handles decimal changes', () => {
      expect(getTrendIndicator(0.01).icon).toBe('↑');
      expect(getTrendIndicator(-0.01).icon).toBe('↓');
    });
  });

  describe('cn (className merger)', () => {
    it('merges class names', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('handles conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'excluded');
      expect(result).toContain('base');
      expect(result).toContain('conditional');
      expect(result).not.toContain('excluded');
    });

    it('handles empty/undefined values', () => {
      const result = cn('base', undefined, null, '');
      expect(result).toBe('base');
    });

    it('merges Tailwind conflicting classes (via twMerge)', () => {
      // twMerge should keep the last conflicting class
      const result = cn('px-2', 'px-4');
      expect(result).toBe('px-4');
    });
  });
});
