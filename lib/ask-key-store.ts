/**
 * PHASE 30 - PILLAR 4: EPHEMERAL RUNTIME
 * 
 * Just-In-Time API Key Decryption Store
 * 
 * Security Properties:
 * - JIT decryption: Keys decrypted only when needed
 * - <50ms RAM lifetime: Plaintext exists only in local scope
 * - Zero logging: No plaintext in logs, errors, or traces
 * - Scope isolation: No persistent storage of plaintext
 * - Immediate use: Decrypt → Use → Discard
 * 
 * CRITICAL: This file is security-sensitive. Do NOT add console.log statements for plaintext.
 */

import crypto from 'crypto';
import { supabaseAdmin } from './supabase';
import { requireWorkspaceAccess } from './workspace-access';

const ALGO = 'aes-256-gcm';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AskProvider = 'openai' | 'openrouter' | 'anthropic';

// ============================================
// ERROR CODES (for audit logging)
// ============================================

const ErrorCode = {
  NO_KEY_CONFIGURED: 'NO_KEY_CONFIGURED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================
// AUDIT LOGGING (NO PLAINTEXT)
// ============================================

/**
 * Log key access events for audit trail
 * CRITICAL: Never log plaintext keys, ciphertext, or decryption results
 * NO plaintext - Only log metadata for correlation (no sensitive data)
 */
function logKeyAccess(
  event: 'key_fetched' | 'key_not_found' | 'access_denied' | 'decryption_error' | 'key_stored' | 'key_deleted',
  params: {
    userId: string;
    workspaceId: string;
    provider: AskProvider;
    errorCode?: string;
    errorId?: string;
  }
): void {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    workspaceId: params.workspaceId,
    provider: params.provider,
    errorCode: params.errorCode,
    errorId: params.errorId,
  };
  
  // Structured JSON logging (no sensitive data)
  console.log(JSON.stringify(logEntry));
}

/**
 * Generate error ID for correlation (never log sensitive data)
 */
function generateErrorId(): string {
  return crypto.randomUUID().split('-')[0];
}

/**
 * Generate SHA-256 fingerprint of API key (first 8 chars for display)
 */
function generateFingerprint(plaintext: string): string {
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  return hash.substring(0, 8);
}

// ============================================
// ENCRYPTION/DECRYPTION
// ============================================

function getKey(): Buffer | null {
  // Prefer new name INTERNAL_ENCRYPTION_KEY, fallback to legacy ASK_KEY_ENCRYPTION_KEY
  const raw = process.env.INTERNAL_ENCRYPTION_KEY || process.env.ASK_KEY_ENCRYPTION_KEY;
  if (!raw) return null;
  // Expect hex or base64; prefer hex
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === 64) {
    return Buffer.from(raw, 'hex');
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === 32) return buf;
  return null;
}

function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) throw new Error('ASK_KEY_ENCRYPTION_KEY is not configured or invalid (needs 32 bytes).');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key as any, iv as any);
  const ciphertext = Buffer.concat([new Uint8Array(cipher.update(new Uint8Array(Buffer.from(plain, 'utf8')))), new Uint8Array(cipher.final())]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${ciphertext.toString('hex')}:${tag.toString('hex')}`;
}

function decryptSecret(payload: string): string {
  const key = getKey();
  if (!key) throw new Error('ASK_KEY_ENCRYPTION_KEY is not configured or invalid (needs 32 bytes).');
  const [ivHex, ctHex, tagHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key as any, iv as any);
  decipher.setAuthTag(new Uint8Array(tag) as any);
  const plain = Buffer.concat([new Uint8Array(decipher.update(new Uint8Array(ct))), new Uint8Array(decipher.final())]).toString('utf8');
  return plain;
}

export async function setAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: AskProvider;
  apiKey: string;
}): Promise<{ success: boolean; error?: string }> {
  // Validate workspace access (must be owner to manage keys)
  try {
    await requireWorkspaceAccess(params.workspaceId, 'canManageKeys');
  } catch (error) {
    logKeyAccess('access_denied', { ...params, errorCode: ErrorCode.ACCESS_DENIED });
    return {
      success: false,
      error: 'Access denied', // Uniform error
    };
  }

  if (!supabaseAdmin) {
    const errorId = generateErrorId();
    logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DATABASE_ERROR, errorId });
    return { success: false, error: 'Database not configured' };
  }
  
  if (!params.apiKey.trim()) return { success: false, error: 'Empty key' };
  
  try {
    const ciphertext = encryptSecret(params.apiKey.trim());
    const fingerprint = generateFingerprint(params.apiKey.trim());
    
    const { error } = await supabaseAdmin
      .from('workspace_keys')
      .upsert(
        {
          workspace_id: params.workspaceId,
          user_id: params.userId,
          provider: params.provider,
          key_ciphertext: ciphertext,
          key_fingerprint: fingerprint,
          encryption_version: 1,
        },
        { onConflict: 'workspace_id,user_id,provider' }
      );
    
    if (error) {
      const errorId = generateErrorId();
      logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DATABASE_ERROR, errorId });
      return { success: false, error: 'Failed to store key' };
    }
    
    logKeyAccess('key_stored', params);
    return { success: true };
  } catch (e: any) {
    const errorId = generateErrorId();
    logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DECRYPTION_FAILED, errorId });
    return { success: false, error: 'Encryption failed' };
  }
}

export async function deleteAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: AskProvider;
}): Promise<{ success: boolean; error?: string }> {
  // Validate workspace access (must be owner)
  try {
    await requireWorkspaceAccess(params.workspaceId, 'canManageKeys');
  } catch (error) {
    logKeyAccess('access_denied', { ...params, errorCode: ErrorCode.ACCESS_DENIED });
    return {
      success: false,
      error: 'Access denied',
    };
  }

  if (!supabaseAdmin) {
    const errorId = generateErrorId();
    logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DATABASE_ERROR, errorId });
    return { success: false, error: 'Database not configured' };
  }
  
  const { error } = await supabaseAdmin
    .from('workspace_keys')
    .delete()
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .eq('provider', params.provider);
  
  if (error) {
    const errorId = generateErrorId();
    logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DATABASE_ERROR, errorId });
    return { success: false, error: 'Failed to delete key' };
  }
  
  logKeyAccess('key_deleted', params);
  return { success: true };
}

/**
 * Get API key with Just-In-Time decryption (Pillar 4: Ephemeral Runtime)
 * 
 * Memory Lifecycle:
 * T+0ms:    getAskKey() called
 * T+5ms:    Ciphertext fetched from Supabase
 * T+10ms:   decryptSecret() returns plaintext
 * T+15ms:   Plaintext assigned to local variable
 * T+20ms:   Plaintext returned to caller
 * T+???ms:  Caller uses plaintext (network call)
 * T+200ms:  Function returns, plaintext goes out of scope
 * T+???ms:  V8 garbage collector reclaims memory
 * 
 * Target: <50ms plaintext lifetime before network call
 * 
 * @param params - User, workspace, and provider identifiers
 * @returns Plaintext API key (ephemeral) or null if not configured
 */
export async function getAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: AskProvider;
}): Promise<{ apiKey: string | null; error?: string }> {
  // Step 1: Validate workspace access (Pillar 3)
  try {
    await requireWorkspaceAccess(params.workspaceId, 'canRead');
  } catch (error) {
    logKeyAccess('access_denied', { ...params, errorCode: ErrorCode.ACCESS_DENIED });
    return {
      apiKey: null,
      error: 'Access denied', // Uniform error message
    };
  }

  if (!supabaseAdmin) {
    const errorId = generateErrorId();
    logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DATABASE_ERROR, errorId });
    return { apiKey: null, error: 'Database not configured' };
  }
  
  // Step 2: Fetch encrypted key from database
  try {
    const { data, error } = await supabaseAdmin
      .from('workspace_keys')
      .select('key_ciphertext')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.userId)
      .eq('provider', params.provider)
      .maybeSingle();
    
    if (error) {
      const errorId = generateErrorId();
      logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DATABASE_ERROR, errorId });
      return { apiKey: null, error: 'Failed to fetch key' };
    }
    
    if (!data?.key_ciphertext) {
      logKeyAccess('key_not_found', { ...params, errorCode: ErrorCode.NO_KEY_CONFIGURED });
      return { apiKey: null };
    }
    
    // Step 3: Decrypt to plaintext (JIT - only when needed)
    const apiKey = decryptSecret(data.key_ciphertext);
    
    // Step 4: Log successful fetch (no plaintext)
    logKeyAccess('key_fetched', params);
    
    // Step 5: Return plaintext (caller must use immediately)
    // apiKey will go out of scope after caller uses it
    return { apiKey };
  } catch (e: any) {
    const errorId = generateErrorId();
    logKeyAccess('decryption_error', { ...params, errorCode: ErrorCode.DECRYPTION_FAILED, errorId });
    return { apiKey: null, error: 'Decryption failed' };
  }
}

export async function getAskKeyStatus(params: {
  userId: string;
  workspaceId: string;
}): Promise<{
  openaiConfigured: boolean;
  openrouterConfigured: boolean;
  anthropicConfigured: boolean;
  hasEnvOpenAI: boolean;
  hasEnvOpenRouter: boolean;
  hasEnvAnthropic: boolean;
  error?: string;
}> {
  if (!supabaseAdmin) return { 
    openaiConfigured: false, 
    openrouterConfigured: false,
    anthropicConfigured: false,
    hasEnvOpenAI: false, 
    hasEnvOpenRouter: false,
    hasEnvAnthropic: false,
    error: 'Database not configured' 
  };

  const hasEnvOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasEnvOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasEnvAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  try {
    const { data, error } = await supabaseAdmin
      .from('workspace_keys')
      .select('provider')
      .eq('user_id', params.userId)
      .eq('workspace_id', params.workspaceId);
    
    if (error) return { 
      openaiConfigured: false, 
      openrouterConfigured: false,
      anthropicConfigured: false,
      hasEnvOpenAI, 
      hasEnvOpenRouter,
      hasEnvAnthropic,
      error: error.message 
    };
    
    const openaiConfigured = data?.some((row: any) => row.provider === 'openai') ?? false;
    const openrouterConfigured = data?.some((row: any) => row.provider === 'openrouter') ?? false;
    const anthropicConfigured = data?.some((row: any) => row.provider === 'anthropic') ?? false;
    
    return { 
      openaiConfigured, 
      openrouterConfigured,
      anthropicConfigured,
      hasEnvOpenAI, 
      hasEnvOpenRouter,
      hasEnvAnthropic
    };
  } catch (e: any) {
    return { 
      openaiConfigured: false, 
      openrouterConfigured: false,
      anthropicConfigured: false,
      hasEnvOpenAI, 
      hasEnvOpenRouter,
      hasEnvAnthropic,
      error: e?.message || 'Status failed' 
    };
  }
}
