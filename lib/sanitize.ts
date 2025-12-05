/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .slice(0, maxLength)
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-related patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .slice(0, 254) // Max email length
    .replace(/[^\w.@+-]/g, ''); // Only allow valid email chars
}

/**
 * Sanitize SQL-like identifier (table names, column names)
 * Only allows alphanumeric and underscores
 */
export function sanitizeIdentifier(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .slice(0, 64)
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}

/**
 * Sanitize URL to prevent open redirects
 * Only allows relative URLs or URLs to allowed domains
 */
export function sanitizeUrl(url: string, allowedDomains: string[] = []): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // If it's a relative URL, allow it
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url.slice(0, 2000);
    }
    
    const parsed = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Check against allowed domains
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) return null;
    }
    
    return url.slice(0, 2000);
  } catch {
    return null;
  }
}

/**
 * Sanitize object by recursively sanitizing all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { maxStringLength?: number; maxDepth?: number } = {}
): T {
  const { maxStringLength = 1000, maxDepth = 5 } = options;
  
  function sanitize(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return null;
    
    if (typeof value === 'string') {
      return sanitizeString(value, maxStringLength);
    }
    
    if (Array.isArray(value)) {
      return value.slice(0, 100).map(v => sanitize(v, depth + 1));
    }
    
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        const sanitizedKey = sanitizeIdentifier(k);
        if (sanitizedKey) {
          result[sanitizedKey] = sanitize(v, depth + 1);
        }
      }
      return result;
    }
    
    return value;
  }
  
  return sanitize(obj, 0) as T;
}

/**
 * Validate and sanitize webhook payload
 */
export function validateWebhookPayload(payload: unknown): {
  valid: boolean;
  data?: Record<string, unknown>;
  error?: string;
} {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload: expected object' };
  }
  
  const obj = payload as Record<string, unknown>;
  
  // Check for overly large payloads
  const jsonSize = JSON.stringify(obj).length;
  if (jsonSize > 100_000) {
    return { valid: false, error: 'Payload too large (max 100KB)' };
  }
  
  // Sanitize the payload
  const sanitized = sanitizeObject(obj);
  
  return { valid: true, data: sanitized };
}

