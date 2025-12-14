'use client';

import React from 'react';
import { SWRConfig, SWRConfiguration } from 'swr';
import { fetcher } from './fetcher';

/**
 * Global SWR Configuration
 * 
 * Centralizes all SWR settings for consistent behavior across the app.
 */
const swrConfig: SWRConfiguration = {
  // Use our deduplicated fetcher by default
  fetcher,

  // Revalidation settings
  revalidateOnFocus: false,        // Don't refetch when window regains focus
  revalidateOnReconnect: true,     // Refetch when network reconnects
  revalidateIfStale: true,         // Refetch if data is stale
  
  // Deduplication
  dedupingInterval: 10000,         // Dedupe requests within 10 seconds
  
  // Error handling
  errorRetryCount: 2,              // Retry failed requests twice
  errorRetryInterval: 3000,        // Wait 3 seconds between retries
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return true;
  },
  
  // Loading behavior
  keepPreviousData: true,          // Show stale data while revalidating
  
  // Performance
  suspense: false,                 // Don't use React Suspense (we handle loading states)
  
  // Global error handler
  onError: (error, key) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable-next-line no-console */
      console.error(`SWR Error for ${key}:`, error);
    }
    
    // In production, you might want to send to error tracking service
    // e.g., Sentry.captureException(error)
  },
  
  // Success handler (for debugging)
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable-next-line no-console */
      console.debug(`SWR Success for ${key}:`, { dataSize: JSON.stringify(data).length });
    }
  },
};

/**
 * SWR Provider wrapper
 * 
 * Wrap your app with this to apply global SWR configuration.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}

/**
 * Export config for use in individual hooks if needed
 */
export { swrConfig };

