/**
 * Cryptographic Core - AES-256-GCM Implementation
 * 
 * SECURITY ARCHITECTURE: Phase 30 - Pillar 1
 * 
 * This module provides the mathematical foundation for all encryption operations.
 * It implements AES-256-GCM with the following security guarantees:
 * 
 * - 256-bit key strength (2^256 operations to brute force)
 * - 96-bit IV (NIST SP 800-38D recommended, optimized for GCM)
 * - 128-bit authentication tag (2^-128 forgery probability)
 * - Constant-time operations (timing attack resistant)
 * - Opaque types (prevents accidental plaintext logging)
 * 
 * @see docs/PHASE_30_SECURITY_ARCHITECTURE.md
 */

import crypto from 'crypto';

// ============================================
// OPAQUE TYPES (Compile-time Safety)
// ============================================

/**
 * Opaque type for encrypted strings.
 * Prevents accidental logging or misuse of ciphertext.
 * 
 * @example
 * // ✅ SAFE: Type system enforces proper usage
 * const encrypted: EncryptedString = encrypt("secret");
 * const decrypted: string = decrypt(encrypted);
 * 
 * // ❌ UNSAFE: Compile error prevents this
 * const plain = "not-encrypted";
 * decrypt(plain); // Error: string not assignable to EncryptedString
 */
declare const EncryptedBrand: unique symbol;
export type EncryptedString = string & { [EncryptedBrand]: never };

// ============================================
// CONSTANTS
// ============================================

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12; // 96 bits (NIST recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits (maximum forgery resistance)
const KEY_LENGTH = 32; // 256 bits

/**
 * Format: IV(24 hex chars):CIPHERTEXT(variable):AUTHTAG(32 hex chars)
 * Example: "a1b2c3d4e5f6789012345678:4a5b6c7d8e9f0a1b2c3d4e5f:9f8e7d6c5b4a39281726354"
 */
const CIPHERTEXT_REGEX = /^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/;

// ============================================
// KEY MANAGEMENT
// ============================================

/**
 * Retrieve and validate the master encryption key.
 * 
 * Environment variables checked (in order):
 * 1. INTERNAL_ENCRYPTION_KEY (preferred)
 * 2. ASK_KEY_ENCRYPTION_KEY (legacy)
 * 
 * Format: 64-character hex string OR 44-character base64
 * 
 * @throws {Error} If key is missing or invalid
 * @returns {Buffer} 32-byte encryption key
 */
function getMasterKey(): Buffer {
  const raw = process.env.INTERNAL_ENCRYPTION_KEY || process.env.ASK_KEY_ENCRYPTION_KEY;
  
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY_MISSING: Set INTERNAL_ENCRYPTION_KEY environment variable. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Try hex format (64 characters)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  // Try base64 format
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === KEY_LENGTH) {
    return buf;
  }

  throw new Error(
    `ENCRYPTION_KEY_INVALID: Key must be 32 bytes (64 hex chars or 44 base64 chars). Got ${raw.length} chars.`
  );
}

// ============================================
// ENCRYPTION
// ============================================

/**
 * Encrypt plaintext using AES-256-GCM.
 * 
 * Security properties:
 * - Random IV per encryption (prevents IV reuse attacks)
 * - Authenticated encryption (prevents tampering)
 * - No padding oracle vulnerability (GCM mode)
 * 
 * @param plaintext - Secret data to encrypt (e.g., API key)
 * @returns {EncryptedString} IV:CIPHERTEXT:AUTHTAG (hex-encoded)
 * 
 * @throws {Error} If encryption fails or key is invalid
 * 
 * @example
 * const apiKey = "sk-proj-abc123...";
 * const encrypted = encrypt(apiKey);
 * // Returns: "a1b2c3d4e5f6789012345678:4a5b6c7d8e9f0a1b:9f8e7d6c5b4a3928"
 */
export function encrypt(plaintext: string): EncryptedString {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('ENCRYPT_INVALID_INPUT: Plaintext must be a non-empty string');
  }

  try {
    const key = getMasterKey();
    
    // Generate cryptographically random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher (casts to appease TS libcrypto typings)
    const cipher = crypto.createCipheriv(ALGORITHM as any, key as any, iv as any) as any;
    
    // Encrypt
    const chunk1 = Buffer.from((cipher.update(plaintext, 'utf8') as any) as Uint8Array);
    const chunk2 = Buffer.from((cipher.final() as any) as Uint8Array);
    const encrypted = (Buffer.concat([chunk1 as any, chunk2 as any]) as unknown) as Buffer;

    // Get authentication tag
    const authTag = Buffer.from((cipher.getAuthTag() as any) as Uint8Array);
    
    // Format: IV:CIPHERTEXT:TAG (all hex-encoded)
    const result = `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
    
    return result as EncryptedString;
  } catch (error) {
    // Uniform error (no information leakage)
    const errorId = crypto.randomUUID();
    /* eslint-disable-next-line no-console */
    console.error(`[${errorId}] Encryption failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`ENCRYPT_FAILED: ${errorId}`);
  }
}

// ============================================
// DECRYPTION
// ============================================

/**
 * Decrypt ciphertext using AES-256-GCM.
 * 
 * Security properties:
 * - Authentication tag verification (prevents tampering)
 * - Constant-time comparison (prevents timing attacks)
 * - Generic error messages (prevents oracle attacks)
 * 
 * @param ciphertext - Encrypted string from encrypt()
 * @returns {string} Original plaintext
 * 
 * @throws {Error} If decryption fails, authentication fails, or format invalid
 * 
 * @example
 * const encrypted: EncryptedString = ...;
 * const apiKey = decrypt(encrypted);
 * // Use apiKey immediately, let it go out of scope
 */
export function decrypt(ciphertext: EncryptedString): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('DECRYPT_INVALID_INPUT');
  }

  // Validate format before attempting decryption
  if (!CIPHERTEXT_REGEX.test(ciphertext)) {
    const errorId = crypto.randomUUID();
    /* eslint-disable-next-line no-console */
    console.error(`[${errorId}] Invalid ciphertext format`);
    throw new Error(`DECRYPT_FAILED: ${errorId}`);
  }

  try {
    const key = getMasterKey();
    
    // Parse components
    const [ivHex, encryptedHex, authTagHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Validate component lengths
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid component lengths');
    }
    
    // Create decipher (casts for TS)
    const decipher = crypto.createDecipheriv(ALGORITHM as any, key as any, iv as any) as any;
    decipher.setAuthTag(authTag as any);
    
    // Decrypt
    const dchunk1 = Buffer.from((decipher.update(encrypted) as any) as Uint8Array);
    const dchunk2 = Buffer.from((decipher.final() as any) as Uint8Array);
    const decrypted = (Buffer.concat([dchunk1 as any, dchunk2 as any]) as unknown) as Buffer;

    return decrypted.toString('utf8');
  } catch (error) {
    // Uniform error (do NOT reveal if it was auth failure vs. wrong key)
    const errorId = crypto.randomUUID();
    /* eslint-disable-next-line no-console */
    console.error(`[${errorId}] Decryption failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`DECRYPT_FAILED: ${errorId}`);
  }
}

// ============================================
// KEY FINGERPRINTING
// ============================================

/**
 * Generate a fingerprint of plaintext for display purposes.
 * 
 * Use case: Show users which key is configured without revealing the actual key.
 * Format: First 8 characters of SHA-256 hash (32-bit collision resistance).
 * 
 * @param plaintext - Secret to fingerprint
 * @returns {string} 8-character hex string (e.g., "a1b2c3d4")
 * 
 * @example
 * const apiKey = "sk-proj-abc123...";
 * const fingerprint = generateFingerprint(apiKey);
 * // Display: "Key ending in a1b2c3d4"
 */
export function generateFingerprint(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('FINGERPRINT_INVALID_INPUT');
  }

  const hash = crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
  return hash.substring(0, 8);
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that a string is properly formatted ciphertext.
 * 
 * Does NOT decrypt or validate authenticity - only checks format.
 * 
 * @param value - String to validate
 * @returns {boolean} True if format matches IV:CIPHERTEXT:TAG
 */
export function isValidCiphertext(value: string): value is EncryptedString {
  return typeof value === 'string' && CIPHERTEXT_REGEX.test(value);
}

/**
 * Check if encryption is properly configured.
 * 
 * Use this in startup checks or health endpoints.
 * 
 * @returns {boolean} True if INTERNAL_ENCRYPTION_KEY is set and valid
 */
export function isEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

// ============================================
// TESTING UTILITIES
// ============================================

/**
 * Test encryption/decryption round-trip.
 * 
 * @internal For testing only - not for production use
 * 
 * @param plaintext - Test value
 * @returns {boolean} True if encrypt(decrypt(x)) === x
 */
export function testRoundTrip(plaintext: string): boolean {
  try {
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    return decrypted === plaintext;
  } catch {
    return false;
  }
}

// ============================================
// LEGACY ALIASES (for compatibility)
// ============================================

/**
 * Alias for encrypt() - provided for compatibility
 * @see encrypt
 */
export const encryptSecret = encrypt;

/**
 * Alias for decrypt() - provided for compatibility
 * @see decrypt
 */
export const decryptSecret = decrypt;
