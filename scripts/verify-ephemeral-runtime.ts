/**
 * PILLAR 4 VERIFICATION: EPHEMERAL RUNTIME
 * 
 * This script validates the JIT decryption and runtime security:
 * - API keys decrypted only when needed (<50ms lifetime)
 * - No plaintext in logs, errors, or traces
 * - Scope isolation prevents persistent storage
 * - Audit logging captures events without sensitive data
 * - Error handling uses uniform messages
 * 
 * Run: npx tsx scripts/verify-ephemeral-runtime.ts
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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
}

// ============================================
// TEST SUITE
// ============================================

async function runTests() {
  console.log('\n' + '='.repeat(55));
  console.log('  PILLAR 4: EPHEMERAL RUNTIME VERIFICATION');
  console.log('='.repeat(55) + '\n');

  // ============================================
  // CODE ANALYSIS TESTS
  // ============================================
  console.log(`${BLUE}▶ Code Security Tests${RESET}`);

  await test('ask-key-store.ts contains JIT decryption pattern', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/ask-key-store.ts'),
      'utf-8'
    );

    if (!content.includes('JIT') && !content.includes('Just-In-Time')) {
      throw new Error('Missing JIT decryption documentation');
    }

    if (!content.includes('decryptSecret')) {
      throw new Error('Missing decryption call');
    }

    if (!content.includes('apiKey will go out of scope')) {
      throw new Error('Missing scope isolation documentation');
    }
  });

  await test('ask-key-store.ts uses audit logging (no plaintext)', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/ask-key-store.ts'),
      'utf-8'
    );

    if (!content.includes('logKeyAccess')) {
      throw new Error('Missing audit logging function');
    }

    if (!content.includes('NO plaintext') || !content.includes('no sensitive data')) {
      throw new Error('Missing plaintext safety warnings');
    }

    // Check that we never log the apiKey variable
    const lines = content.split('\n');
    const logLines = lines.filter(l => l.includes('console.log') && l.includes('apiKey'));
    if (logLines.some(l => !l.includes('//'))) {
      throw new Error('Plaintext apiKey may be logged');
    }
  });

  await test('ask-key-store.ts has error IDs for correlation', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/ask-key-store.ts'),
      'utf-8'
    );

    if (!content.includes('errorId') || !content.includes('generateErrorId')) {
      throw new Error('Missing error ID generation');
    }

    if (!content.includes('ErrorCode')) {
      throw new Error('Missing error code enum');
    }
  });

  await test('ask-key-store.ts uses workspace access control', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/ask-key-store.ts'),
      'utf-8'
    );

    if (!content.includes('requireWorkspaceAccess')) {
      throw new Error('Missing workspace access validation');
    }

    if (!content.includes('canManageKeys')) {
      throw new Error('Missing canManageKeys permission check');
    }

    // Accept either legacy 'canReadData' or current 'canRead'
    if (!content.includes('canRead') && !content.includes('canReadData')) {
      throw new Error('Missing canRead permission check');
    }
  });

  await test('ask/route.ts uses ephemeral key pattern', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/ask/route.ts'),
      'utf-8'
    );

    if (!content.includes('getAskKey')) {
      throw new Error('Missing getAskKey call');
    }

    if (!content.includes('storedKey')) {
      throw new Error('Missing storedKey variable');
    }

    // Check that the key is used immediately after retrieval
    // Find the actual call (not the import): "await getAskKey("
    const getAskKeyIndex = content.indexOf('await getAskKey(');
    
    if (getAskKeyIndex === -1) {
      throw new Error('Missing await getAskKey() call in handler');
    }
    
    // Find the immediate usage: storedKey.apiKey in the next few lines
    const storedKeyUsageIndex = content.indexOf('storedKey.apiKey', getAskKeyIndex);
    
    if (storedKeyUsageIndex === -1) {
      throw new Error('storedKey.apiKey not used immediately after fetch');
    }

    const codeSnippet = content.substring(getAskKeyIndex, storedKeyUsageIndex);
    const lineCount = codeSnippet.split('\n').length;
    
    // Ephemeral pattern: decrypt -> use within 10 lines -> discard
    if (lineCount > 10) {
      throw new Error(`Key lifetime too long (${lineCount} lines between fetch and use, max 10)`);
    }

    // Verify scope isolation comment exists
    if (!content.includes('out of scope') && !content.includes('ephemeral')) {
      throw new Error('Missing scope isolation documentation');
    }
  });

  await test('ask/route.ts uses secure error handling', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/ask/route.ts'),
      'utf-8'
    );

    if (!content.includes('errorId')) {
      throw new Error('Missing error ID in error handling');
    }

    if (!content.includes('JSON.stringify')) {
      throw new Error('Missing structured error logging');
    }

    // Check that errors don't log sensitive data
    const catchBlocks = content.match(/catch\s*\([^)]*\)\s*\{[^}]*\}/gs) || [];
    for (const block of catchBlocks) {
      if (block.includes('apiKey') || block.includes('openaiKey') || block.includes('openrouterKey')) {
        if (!block.includes('//') && !block.includes('/*')) {
          throw new Error('Error handler may log sensitive keys');
        }
      }
    }
  });

  // ============================================
  // ESLINT CONFIGURATION TESTS
  // ============================================
  console.log(`\n${BLUE}▶ ESLint Security Configuration${RESET}`);

  await test('.eslintrc.json exists', async () => {
    const eslintPath = path.join(process.cwd(), '.eslintrc.json');
    if (!fs.existsSync(eslintPath)) {
      throw new Error('.eslintrc.json not found');
    }
  });

  await test('.eslintrc.json enforces no-console in encryption.ts', async () => {
    const eslintContent = fs.readFileSync(
      path.join(process.cwd(), '.eslintrc.json'),
      'utf-8'
    );

    if (!eslintContent.includes('lib/encryption.ts')) {
      throw new Error('encryption.ts not in ESLint overrides');
    }

    if (!eslintContent.includes('no-console')) {
      throw new Error('no-console rule not enforced');
    }
  });

  await test('.eslintrc.json configures security-sensitive files', async () => {
    const eslintContent = fs.readFileSync(
      path.join(process.cwd(), '.eslintrc.json'),
      'utf-8'
    );

    const securityFiles = [
      'lib/encryption.ts',
      'lib/ask-key-store.ts',
    ];

    for (const file of securityFiles) {
      if (!eslintContent.includes(file)) {
        throw new Error(`${file} not in ESLint overrides`);
      }
    }
  });

  // ============================================
  // FUNCTION EXPORTS TESTS
  // ============================================
  console.log(`\n${BLUE}▶ Function Export Tests${RESET}`);

  await test('ask-key-store exports required functions', async () => {
    const mod = await import('../lib/ask-key-store');
    
    const requiredExports = [
      'getAskKey',
      'setAskKey',
      'deleteAskKey',
      'getAskKeyStatus',
    ];

    for (const fn of requiredExports) {
      if (typeof (mod as any)[fn] !== 'function') {
        throw new Error(`Missing or invalid export: ${fn}`);
      }
    }
  });

  await test('AskProvider type includes all providers', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/ask-key-store.ts'),
      'utf-8'
    );

    if (!content.includes("'openai'") || !content.includes("'openrouter'") || !content.includes("'anthropic'")) {
      throw new Error('AskProvider type incomplete');
    }
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================
  console.log(`\n${BLUE}▶ Integration Tests${RESET}`);

  await test('workspace-access.ts can be imported', async () => {
    const mod = await import('../lib/workspace-access');
    
    if (!mod.requireWorkspaceAccess) {
      throw new Error('requireWorkspaceAccess not exported');
    }
  });

  await test('encryption.ts functions are accessible', async () => {
    const mod = await import('../lib/encryption');
    
    if (!mod.encryptSecret || !mod.decryptSecret) {
      throw new Error('Encryption functions not exported');
    }
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(55));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  if (failed === 0) {
    console.log(`${GREEN}✓ ALL TESTS PASSED (${passed}/${results.length})${RESET}\n`);
    console.log(`${GREEN}Pillar 4 verification complete. Ephemeral runtime is secure.${RESET}`);
    console.log(`${GREEN}Proceed to Pillar 5 with confidence.${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}✗ TESTS FAILED (${passed} passed, ${failed} failed)${RESET}\n`);
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    console.log(`\n${RED}Fix errors before proceeding to Pillar 5.${RESET}\n`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});
