'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if resetKeys changed
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-surface rounded-xl border border-border">
          <AlertTriangle className="h-12 w-12 text-accent-warning mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary text-center mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={this.handleRetry}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper
 * Use this for functional components
 */
interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary fallback={options.fallback} onError={options.onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `WithErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Compact error display for inline use
 */
interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorDisplay({ error, onRetry, compact = false }: ErrorDisplayProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm">
        <AlertTriangle className="h-4 w-4 text-accent-danger shrink-0" />
        <span className="text-text-primary truncate">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-accent-primary hover:text-accent-primary/80 transition-colors shrink-0"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-accent-danger/5 border border-accent-danger/20 rounded-xl">
      <AlertTriangle className="h-8 w-8 text-accent-danger mb-3" />
      <p className="text-sm text-text-primary text-center mb-3">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

