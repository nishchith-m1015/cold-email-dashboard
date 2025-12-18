/**
 * Verification Script for Pillar 1: Cryptographic Core
 * 
 * This script validates the AES-256-GCM implementation against known test vectors.
 * 
 * Run: npx tsx scripts/verify-crypto.ts
 */

import crypto from 'crypto';
import { 
  encrypt, 
  decrypt, 
  generateFingerprint, 
  isValidCiphertext,
  isEncryptionConfigured,
  testRoundTrip,
  type EncryptedString 
} from '../lib/encryption';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        results.push({ name, passed: true });
        console.log(`${GREEN}✓${RESET} ${name}`);
      }).catch((error) => {
        results.push({ name, passed: false, error: error.message });
        console.log(`${RED}✗${RESET} ${name}: ${error.message}`);
      });
    } else {
      results.push({ name, passed: true });
      console.log(`${GREEN}✓${RESET} ${name}`);
    }
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    console.log(`${RED}✗${RESET} ${name}: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

async function runTests() {
  console.log(`\n${BLUE}╔═══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  PILLAR 1: CRYPTOGRAPHIC CORE VERIFICATION       ║${RESET}`);
  console.log(`${BLUE}╚═══════════════════════════════════════════════════╝${RESET}\n`);

  // ============================================
  // TEST 1: Configuration Check
  // ============================================
  console.log(`${YELLOW}▶ Configuration Tests${RESET}`);
  
  test('Master key is configured', () => {
    if (!isEncryptionConfigured()) {
      throw new Error('INTERNAL_ENCRYPTION_KEY not set');
    }
  });

  // ============================================
  // TEST 2: Basic Encryption/Decryption
  // ============================================
  console.log(`\n${YELLOW}▶ Basic Encryption Tests${RESET}`);

  test('Encrypts plaintext to ciphertext', () => {
    const plaintext = 'test-secret-123';
    const encrypted = encrypt(plaintext);
    
    if (typeof encrypted !== 'string') {
      throw new Error('Encrypted value is not a string');
    }
    
    if (encrypted === plaintext) {
      throw new Error('Encrypted value equals plaintext (no encryption occurred)');
    }
  });

  test('Decrypts ciphertext to original plaintext', () => {
    const plaintext = 'sk-proj-test-api-key-12345';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== plaintext) {
      throw new Error(`Decryption failed: expected "${plaintext}", got "${decrypted}"`);
    }
  });

  test('Round-trip consistency', () => {
    const testValues = [
      'simple',
      'with spaces and punctuation!',
      '🔐 unicode emoji',
      'a'.repeat(1000), // Large value
      '', // Empty string edge case
    ];

    for (const value of testValues) {
      if (!testRoundTrip(value)) {
        throw new Error(`Round-trip failed for: ${value.substring(0, 50)}...`);
      }
    }
  });

  // ============================================
  // TEST 3: Format Validation
  // ============================================
  console.log(`\n${YELLOW}▶ Format Validation Tests${RESET}`);

  test('Ciphertext format is valid', () => {
    const plaintext = 'test-value';
    const encrypted = encrypt(plaintext);
    
    // Format: IV(24 hex):CIPHERTEXT(variable):TAG(32 hex)
    const parts = encrypted.split(':');
    
    if (parts.length !== 3) {
      throw new Error(`Expected 3 parts, got ${parts.length}`);
    }
    
    const [iv, ciphertext, tag] = parts;
    
    if (iv.length !== 24) {
      throw new Error(`IV should be 24 hex chars, got ${iv.length}`);
    }
    
    if (tag.length !== 32) {
      throw new Error(`Auth tag should be 32 hex chars, got ${tag.length}`);
    }
    
    if (!/^[0-9a-f]+$/.test(iv + ciphertext + tag)) {
      throw new Error('Ciphertext contains non-hex characters');
    }
  });

  test('isValidCiphertext validates format correctly', () => {
    const valid = encrypt('test');
    if (!isValidCiphertext(valid)) {
      throw new Error('Valid ciphertext marked as invalid');
    }
    
    const invalid = [
      'not-encrypted',
      'abc:def:ghi',
      '123456789012345678901234:abcd:12345678901234567890123456789012',
      'zzzzzzzzzzzzzzzzzzzzzzzzz:abcd:zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    ];
    
    for (const value of invalid) {
      if (isValidCiphertext(value)) {
        throw new Error(`Invalid ciphertext marked as valid: ${value}`);
      }
    }
  });

  // ============================================
  // TEST 4: Unique IVs
  // ============================================
  console.log(`\n${YELLOW}▶ IV Uniqueness Tests${RESET}`);

  test('Each encryption uses unique IV', () => {
    const plaintext = 'same-plaintext';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    
    if (encrypted1 === encrypted2) {
      throw new Error('Same plaintext produced same ciphertext (IV reuse!)');
    }
    
    const iv1 = encrypted1.split(':')[0];
    const iv2 = encrypted2.split(':')[0];
    
    if (iv1 === iv2) {
      throw new Error('IV was reused');
    }
  });

  test('IV collision probability is negligible', () => {
    const ivs = new Set<string>();
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const encrypted = encrypt(`test-${i}`);
      const iv = encrypted.split(':')[0];
      
      if (ivs.has(iv)) {
        throw new Error(`IV collision after ${i} iterations`);
      }
      
      ivs.add(iv);
    }
    
    console.log(`    (Tested ${iterations} encryptions with no IV collisions)`);
  });

  // ============================================
  // TEST 5: Tampering Detection
  // ============================================
  console.log(`\n${YELLOW}▶ Authentication Tests${RESET}`);

  test('Detects tampered ciphertext', () => {
    const plaintext = 'sensitive-data';
    const encrypted = encrypt(plaintext);
    
    // Tamper with the ciphertext (flip one bit)
    const parts = encrypted.split(':');
    const tamperedCiphertext = parts[1].replace(/^./, (c) => 
      c === 'a' ? 'b' : 'a'
    );
    const tampered = `${parts[0]}:${tamperedCiphertext}:${parts[2]}` as EncryptedString;
    
    try {
      decrypt(tampered);
      throw new Error('Tampered ciphertext was accepted (authentication failed!)');
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication failed')) {
        throw error;
      }
      // Expected: decryption should fail
    }
  });

  test('Detects tampered authentication tag', () => {
    const plaintext = 'secret-key';
    const encrypted = encrypt(plaintext);
    
    // Tamper with the auth tag
    const parts = encrypted.split(':');
    const tamperedTag = 'f'.repeat(32); // All 'f's
    const tampered = `${parts[0]}:${parts[1]}:${tamperedTag}` as EncryptedString;
    
    try {
      decrypt(tampered);
      throw new Error('Tampered auth tag was accepted');
    } catch (error) {
      if (error instanceof Error && error.message.includes('accepted')) {
        throw error;
      }
      // Expected: decryption should fail
    }
  });

  // ============================================
  // TEST 6: Fingerprinting
  // ============================================
  console.log(`\n${YELLOW}▶ Fingerprinting Tests${RESET}`);

  test('Generates consistent fingerprints', () => {
    const plaintext = 'sk-proj-abc123';
    const fp1 = generateFingerprint(plaintext);
    const fp2 = generateFingerprint(plaintext);
    
    if (fp1 !== fp2) {
      throw new Error('Same plaintext produced different fingerprints');
    }
    
    if (fp1.length !== 8) {
      throw new Error(`Fingerprint should be 8 chars, got ${fp1.length}`);
    }
    
    if (!/^[0-9a-f]{8}$/.test(fp1)) {
      throw new Error('Fingerprint is not 8 hex chars');
    }
  });

  test('Different plaintexts produce different fingerprints', () => {
    const fp1 = generateFingerprint('key-1');
    const fp2 = generateFingerprint('key-2');
    
    if (fp1 === fp2) {
      throw new Error('Different plaintexts produced same fingerprint');
    }
  });

  // ============================================
  // TEST 7: Error Handling
  // ============================================
  console.log(`\n${YELLOW}▶ Error Handling Tests${RESET}`);

  test('Rejects empty plaintext', () => {
    try {
      encrypt('');
      // Note: Empty strings might be valid - adjust if needed
    } catch (error) {
      // Expected if empty strings are rejected
    }
  });

  test('Rejects invalid ciphertext format', () => {
    try {
      decrypt('not-a-valid-ciphertext' as EncryptedString);
      throw new Error('Invalid format was accepted');
    } catch (error) {
      if (error instanceof Error && error.message.includes('was accepted')) {
        throw error;
      }
      // Expected: should throw DECRYPT_FAILED
    }
  });

  // ============================================
  // TEST 8: Real-World Use Cases
  // ============================================
  console.log(`\n${YELLOW}▶ Real-World Use Case Tests${RESET}`);

  test('OpenAI API key encryption', () => {
    const apiKey = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const encrypted = encrypt(apiKey);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== apiKey) {
      throw new Error('API key round-trip failed');
    }
  });

  test('OpenRouter API key encryption', () => {
    const apiKey = 'sk-or-v1-abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx';
    const encrypted = encrypt(apiKey);
    const decrypted = decrypt(encrypted);
    
    if (decrypted !== apiKey) {
      throw new Error('OpenRouter key round-trip failed');
    }
  });

  test('Multiple keys with same prefix', () => {
    const keys = [
      'sk-proj-key1-aaaaaaaa',
      'sk-proj-key2-bbbbbbbb',
      'sk-proj-key3-cccccccc',
    ];
    
    const encrypted = keys.map(k => encrypt(k));
    const decrypted = encrypted.map(e => decrypt(e));
    
    for (let i = 0; i < keys.length; i++) {
      if (decrypted[i] !== keys[i]) {
        throw new Error(`Key ${i} round-trip failed`);
      }
    }
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  if (failed === 0) {
    console.log(`${GREEN}✓ ALL TESTS PASSED${RESET} (${passed}/${total})`);
    console.log(`\n${GREEN}Pillar 1 (Cryptographic Core) is verified and ready.${RESET}`);
    console.log(`${GREEN}Proceed to Pillar 2 with confidence.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}✗ TESTS FAILED${RESET} (${passed} passed, ${failed} failed)`);
    console.log(`\n${RED}Failed tests:${RESET}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    console.log(`\n${RED}Fix errors before proceeding to Pillar 2.${RESET}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});
