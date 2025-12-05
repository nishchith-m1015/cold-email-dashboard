/**
 * Centralized Fetcher with Request Deduplication
 * 
 * Features:
 * - Deduplicates in-flight requests to the same URL
 * - Bypasses browser cache for fresh data
 * - Standardized error handling
 * - Configurable timeout
 */

// In-flight request tracker for deduplication
const inFlightRequests = new Map<string, Promise<unknown>>();

// Request timeout (15 seconds)
const REQUEST_TIMEOUT = 15000;

// Error types for better error handling
export class FetchError extends Error {
  status: number;
  statusText: string;
  url: string;

  constructor(message: string, status: number, statusText: string, url: string) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

export class TimeoutError extends Error {
  url: string;

  constructor(url: string) {
    super(`Request timeout: ${url}`);
    this.name = 'TimeoutError';
    this.url = url;
  }
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): { 
  controller: AbortController; 
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Deduplicated fetcher for SWR
 * 
 * Multiple calls to the same URL while a request is in-flight
 * will share the same promise, preventing duplicate requests.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  // Check for in-flight request
  const existing = inFlightRequests.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  // Create new request with deduplication
  const request = (async () => {
    const { controller, timeoutId } = createTimeoutController(REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          url
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(url);
      }

      throw error;
    } finally {
      // Remove from in-flight after completion (success or error)
      inFlightRequests.delete(url);
    }
  })();

  // Track in-flight request
  inFlightRequests.set(url, request);

  return request as Promise<T>;
}

/**
 * Fetcher with custom options (for POST, etc.)
 */
export async function fetcherWithOptions<T = unknown>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const { controller, timeoutId } = createTimeoutController(REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new FetchError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        url
      );
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(url);
    }

    throw error;
  }
}

/**
 * Get count of currently in-flight requests (for debugging)
 */
export function getInFlightCount(): number {
  return inFlightRequests.size;
}

/**
 * Clear all in-flight requests (for testing/reset)
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}

