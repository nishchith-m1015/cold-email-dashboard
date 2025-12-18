/**
 * n8n API Client
 * 
 * Phase 31 Pillar 2: The n8n Protocol
 * Server-side only - provides REST API calls to n8n for workflow management.
 */

// ============================================
// TYPES
// ============================================

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nActivateResponse {
  id: string;
  active: boolean;
}

export interface N8nError {
  message: string;
  code?: string;
  details?: unknown;
}

export type N8nResult<T> =
  | { success: true; data: T }
  | { success: false; error: N8nError };

// ============================================
// CONFIGURATION
// ============================================

const N8N_API_URL = process.env.N8N_BASE_URL || process.env.N8N_API_URL || '';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

const DEFAULT_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;

// ============================================
// HELPERS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw new Error('Max retries exceeded');
}

function getHeaders(): HeadersInit {
  if (!N8N_API_KEY) {
    throw new Error('N8N_API_KEY environment variable is not set');
  }
  return {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
  };
}

function getBaseUrl(): string {
  if (!N8N_API_URL) {
    throw new Error('N8N_API_URL environment variable is not set');
  }
  return N8N_API_URL.replace(/\/$/, ''); // Remove trailing slash
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get a workflow by ID
 */
export async function getWorkflow(workflowId: string): Promise<N8nResult<N8nWorkflow>> {
  try {
    const response = await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      try {
        const res = await fetch(`${getBaseUrl()}/workflows/${workflowId}`, {
          method: 'GET',
          headers: getHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: {
          message: `Failed to get workflow: ${response.status}`,
          code: `HTTP_${response.status}`,
          details: errorBody,
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_ERROR',
      },
    };
  }
}

/**
 * Activate a workflow by ID
 * POST /workflows/{id}/activate
 */
export async function activateWorkflow(workflowId: string): Promise<N8nResult<N8nActivateResponse>> {
  try {
    const response = await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      try {
        const res = await fetch(`${getBaseUrl()}/workflows/${workflowId}/activate`, {
          method: 'POST',
          headers: getHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: {
          message: `Failed to activate workflow: ${response.status}`,
          code: `HTTP_${response.status}`,
          details: errorBody,
        },
      };
    }

    const data = await response.json();
    return { success: true, data: { id: workflowId, active: data.active ?? true } };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_ERROR',
      },
    };
  }
}

/**
 * Deactivate a workflow by ID
 * POST /workflows/{id}/deactivate
 */
export async function deactivateWorkflow(workflowId: string): Promise<N8nResult<N8nActivateResponse>> {
  try {
    const response = await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      try {
        const res = await fetch(`${getBaseUrl()}/workflows/${workflowId}/deactivate`, {
          method: 'POST',
          headers: getHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: {
          message: `Failed to deactivate workflow: ${response.status}`,
          code: `HTTP_${response.status}`,
          details: errorBody,
        },
      };
    }

    const data = await response.json();
    return { success: true, data: { id: workflowId, active: data.active ?? false } };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_ERROR',
      },
    };
  }
}

/**
 * Toggle a workflow's active state
 * Convenience function that determines current state and toggles
 */
export async function toggleWorkflow(
  workflowId: string, 
  targetState: 'active' | 'inactive'
): Promise<N8nResult<N8nActivateResponse>> {
  if (targetState === 'active') {
    return activateWorkflow(workflowId);
  } else {
    return deactivateWorkflow(workflowId);
  }
}

/**
 * Get all workflows (Phase 32 Pillar 4)
 * GET /workflows
 */
export async function getWorkflows(): Promise<N8nResult<N8nWorkflow[]>> {
  try {
    const response = await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      try {
        const res = await fetch(`${getBaseUrl()}/workflows`, {
          method: 'GET',
          headers: getHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: {
          message: `Failed to get workflows: ${response.status}`,
          code: `HTTP_${response.status}`,
          details: errorBody,
        },
      };
    }

    const data = await response.json();
    return { success: true, data: data.data || [] };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_ERROR',
      },
    };
  }
}

/**
 * Check if n8n client is configured
 * Returns false if environment variables are missing
 */
export function isN8nConfigured(): boolean {
  return Boolean((process.env.N8N_BASE_URL || process.env.N8N_API_URL) && N8N_API_KEY);
}
