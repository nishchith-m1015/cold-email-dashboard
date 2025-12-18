/**
 * Visual Test Component for Error Fallbacks
 * 
 * This component can be temporarily added to a page to visually verify
 * all error fallback components render correctly.
 * 
 * Usage:
 * import { ErrorFallbackShowcase } from '@/components/ui/error-fallback-test';
 * <ErrorFallbackShowcase />
 */

'use client';

import React from 'react';
import {
  KPIErrorFallback,
  ChartErrorFallback,
  TableErrorFallback,
  WidgetErrorFallback,
} from './error-fallbacks';

export function ErrorFallbackShowcase() {
  const mockError = new Error('This is a test error for visual verification');
  const mockReset = () => {
    /* eslint-disable-next-line no-console */
    console.log('Reset triggered');
  };

  return (
    <div className="space-y-8 p-8 bg-background">
      <div>
        <h2 className="text-xl font-bold mb-4">Error Fallback Components Showcase</h2>
        <p className="text-text-secondary mb-8">
          Visual test for all error fallback component types
        </p>
      </div>

      {/* KPI Error Fallback */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">KPIErrorFallback (Compact)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPIErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Total Sends"
          />
          <KPIErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Click Rate"
          />
          <KPIErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Reply Rate"
          />
        </div>
      </div>

      {/* Chart Error Fallback */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">ChartErrorFallback (Medium)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Time Series Chart"
          />
          <ChartErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Daily Sends"
          />
        </div>
      </div>

      {/* Table Error Fallback */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">TableErrorFallback (Full Width)</h3>
        <TableErrorFallback
          error={mockError}
          resetErrorBoundary={mockReset}
          componentName="Campaign Table"
        />
      </div>

      {/* Widget Error Fallback */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-2">WidgetErrorFallback (Flexible)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WidgetErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Efficiency Metrics"
          />
          <WidgetErrorFallback
            error={mockError}
            resetErrorBoundary={mockReset}
            componentName="Step Breakdown"
          />
        </div>
      </div>
    </div>
  );
}
