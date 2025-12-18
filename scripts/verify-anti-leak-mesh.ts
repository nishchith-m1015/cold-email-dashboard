/**
 * PILLAR 5 VERIFICATION: ANTI-LEAK MESH
 * 
 * This script validates the response sanitization and filtering:
 * - Safe view exists and excludes workspace_keys table
 * - API responses use explicit field allowlisting
 * - Type safety prevents accidental secret exposure
 * - No workspace_keys data in frontend-facing responses
 * 
 * Run: npx tsx scripts/verify-anti-leak-mesh.ts
 */

/* eslint-disable no-console */
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
  console.log('  PILLAR 5: ANTI-LEAK MESH VERIFICATION');
  console.log('='.repeat(55) + '\n');

  // ============================================
  // SQL MIGRATION TESTS
  // ============================================
  console.log(`${BLUE}▶ Database Schema Tests${RESET}`);

  await test('Safe view migration file exists', async () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251213_create_safe_views.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file 20251213_create_safe_views.sql not found');
    }

    const content = fs.readFileSync(migrationPath, 'utf-8');
    
    if (!content.includes('CREATE OR REPLACE VIEW safe_workspace_data')) {
      throw new Error('safe_workspace_data view not defined');
    }

    if (content.includes('workspace_keys')) {
      // Check that it's NOT in the SELECT/FROM/JOIN
      const selectSection = content.substring(
        content.indexOf('SELECT'),
        content.indexOf('FROM workspaces')
      );
      if (selectSection.includes('workspace_keys')) {
        throw new Error('safe_workspace_data view must NOT include workspace_keys table');
      }
    }
  });

  await test('Safe view excludes vault columns', async () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251213_create_safe_views.sql');
    const content = fs.readFileSync(migrationPath, 'utf-8');

    const unsafeColumns = ['key_ciphertext', 'key_fingerprint', 'encryption_version'];
    
    for (const col of unsafeColumns) {
      if (content.includes(col)) {
        throw new Error(`Safe view must NOT include column: ${col}`);
      }
    }
  });

  await test('Migration revokes direct access to workspace_keys', async () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251213_create_safe_views.sql');
    const content = fs.readFileSync(migrationPath, 'utf-8');

    if (!content.includes('REVOKE SELECT ON workspace_keys')) {
      throw new Error('Migration must revoke SELECT on workspace_keys from authenticated users');
    }
  });

  // ============================================
  // RESPONSE SANITIZER TESTS
  // ============================================
  console.log(`\n${BLUE}▶ Response Sanitizer Tests${RESET}`);

  await test('response-sanitizer.ts exists', async () => {
    const sanitizerPath = path.join(process.cwd(), 'lib/response-sanitizer.ts');
    if (!fs.existsSync(sanitizerPath)) {
      throw new Error('lib/response-sanitizer.ts not found');
    }
  });

  await test('SafeWorkspaceResponse type excludes vault fields', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/response-sanitizer.ts'),
      'utf-8'
    );

    if (!content.includes('interface SafeWorkspaceResponse')) {
      throw new Error('SafeWorkspaceResponse interface not defined');
    }

    // Check that vault fields are NOT in the interface
    const interfaceSection = content.substring(
      content.indexOf('interface SafeWorkspaceResponse'),
      content.indexOf('}', content.indexOf('interface SafeWorkspaceResponse'))
    );

    const unsafeFields = ['key_ciphertext', 'key_fingerprint', 'encryption_version', 'rotated_at'];
    for (const field of unsafeFields) {
      if (interfaceSection.includes(field)) {
        throw new Error(`SafeWorkspaceResponse must NOT include field: ${field}`);
      }
    }
  });

  await test('Sanitization uses explicit destructuring', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/response-sanitizer.ts'),
      'utf-8'
    );

    if (!content.includes('function sanitizeWorkspace')) {
      throw new Error('sanitizeWorkspace function not found');
    }

    // Check for explicit destructuring (allowlist approach)
    const fnContent = content.substring(
      content.indexOf('function sanitizeWorkspace'),
      content.indexOf('}', content.indexOf('return {', content.indexOf('function sanitizeWorkspace')))
    );

    if (!fnContent.includes('const {') || !fnContent.includes('} = workspace')) {
      throw new Error('sanitizeWorkspace must use explicit destructuring');
    }

    // Verify it doesn't use spread operator on the input (blocklist approach)
    if (fnContent.includes('...workspace')) {
      throw new Error('sanitizeWorkspace must NOT use spread operator on raw input (use allowlist, not blocklist)');
    }
  });

  await test('Type guard prevents unsafe responses', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/response-sanitizer.ts'),
      'utf-8'
    );

    if (!content.includes('function isSafeWorkspaceResponse')) {
      throw new Error('isSafeWorkspaceResponse type guard not found');
    }

    // Check that type guard validates absence of unsafe fields
    if (!content.includes("'key_ciphertext' in obj")) {
      throw new Error('Type guard must check for absence of key_ciphertext');
    }

    if (!content.includes("'key_fingerprint' in obj")) {
      throw new Error('Type guard must check for absence of key_fingerprint');
    }
  });

  await test('Compile-time safety check exists', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/response-sanitizer.ts'),
      'utf-8'
    );

    if (!content.includes('type AssertNoSecrets')) {
      throw new Error('AssertNoSecrets compile-time check not found');
    }

    if (!content.includes('key_ciphertext: any') && !content.includes('key_ciphertext')) {
      throw new Error('AssertNoSecrets must check for key_ciphertext field');
    }
  });

  // ============================================
  // API ENDPOINT TESTS
  // ============================================
  console.log(`\n${BLUE}▶ API Endpoint Tests${RESET}`);

  await test('Workspaces API imports sanitization', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/workspaces/route.ts'),
      'utf-8'
    );

    if (!content.includes("from '@/lib/response-sanitizer'")) {
      throw new Error('Workspaces API must import response-sanitizer');
    }

    if (!content.includes('sanitizeWorkspace')) {
      throw new Error('Workspaces API must use sanitizeWorkspace function');
    }
  });

  await test('Workspaces GET uses sanitization', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/workspaces/route.ts'),
      'utf-8'
    );

    // Find GET handler
    const getHandler = content.substring(
      content.indexOf('export async function GET'),
      content.indexOf('export async function POST', content.indexOf('export async function GET'))
    );

    if (!getHandler.includes('sanitize')) {
      throw new Error('GET handler must sanitize workspace responses');
    }

    // Check that raw workspace data is not directly returned
    if (getHandler.includes('return NextResponse.json') && getHandler.includes('wsDetails')) {
      const returnSection = getHandler.substring(
        getHandler.lastIndexOf('return NextResponse.json'),
        getHandler.length
      );
      
      // If wsDetails is in return, it should be sanitized
      if (returnSection.includes('wsDetails') && !returnSection.includes('sanitize')) {
        throw new Error('Raw wsDetails must be sanitized before returning');
      }
    }
  });

  await test('Workspaces POST uses sanitization', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/workspaces/route.ts'),
      'utf-8'
    );

    // Find POST handler
    const postHandler = content.substring(
      content.indexOf('export async function POST')
    );

    if (!postHandler.includes('sanitize')) {
      throw new Error('POST handler must sanitize workspace response');
    }
  });

  await test('No SELECT * on workspaces table', async () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/workspaces/route.ts'),
      'utf-8'
    );

    // Check for SELECT * patterns
    if (content.includes("select('*')") || content.includes('select("*")')) {
      throw new Error('API must NOT use SELECT * - use explicit column list');
    }
  });

  // ============================================
  // CODE QUALITY TESTS
  // ============================================
  console.log(`\n${BLUE}▶ Code Quality Tests${RESET}`);

  await test('No accidental logging of workspace objects', async () => {
    const workspacesApi = fs.readFileSync(
      path.join(process.cwd(), 'app/api/workspaces/route.ts'),
      'utf-8'
    );

    const lines = workspacesApi.split('\n');
    
    // Look for console.log with workspace/wsDetails variables
    const suspiciousLogs = lines.filter(line => 
      line.includes('console.log') && 
      (line.includes('workspace') || line.includes('wsDetails')) &&
      !line.includes('//') &&
      !line.includes('workspaceId')
    );

    if (suspiciousLogs.length > 0) {
      throw new Error('Detected potential workspace object logging (may leak secrets)');
    }
  });

  await test('Documentation includes security warnings', async () => {
    const sanitizerContent = fs.readFileSync(
      path.join(process.cwd(), 'lib/response-sanitizer.ts'),
      'utf-8'
    );

    if (!sanitizerContent.includes('CRITICAL') && !sanitizerContent.includes('Security')) {
      throw new Error('response-sanitizer.ts must include security documentation');
    }

    if (!sanitizerContent.includes('NEVER') && !sanitizerContent.includes('never')) {
      throw new Error('response-sanitizer.ts must warn about fields that should NEVER be included');
    }
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================
  console.log(`\n${BLUE}▶ Integration Tests${RESET}`);

  await test('Sanitizer functions can be imported', async () => {
    const mod = await import('../lib/response-sanitizer');
    
    if (typeof mod.sanitizeWorkspace !== 'function') {
      throw new Error('sanitizeWorkspace not exported or not a function');
    }

    if (typeof mod.sanitizeWorkspaces !== 'function') {
      throw new Error('sanitizeWorkspaces not exported or not a function');
    }

    if (typeof mod.isSafeWorkspaceResponse !== 'function') {
      throw new Error('isSafeWorkspaceResponse not exported or not a function');
    }
  });

  await test('Sanitizer produces correct output structure', async () => {
    const mod = await import('../lib/response-sanitizer');
    
    const testInput = {
      id: 'test-id',
      name: 'Test Workspace',
      slug: 'test',
      plan: 'free',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      // Unsafe fields that should be dropped
      key_ciphertext: 'abc123:def456:ghi789',
      key_fingerprint: 'abcd1234',
      encryption_version: 1,
    };

    const sanitized = mod.sanitizeWorkspace(testInput);

    // Check safe fields are present
    if (sanitized.id !== 'test-id') {
      throw new Error('sanitizeWorkspace must preserve id');
    }

    if (sanitized.name !== 'Test Workspace') {
      throw new Error('sanitizeWorkspace must preserve name');
    }

    // Check unsafe fields are removed
    if ('key_ciphertext' in sanitized) {
      throw new Error('sanitizeWorkspace must remove key_ciphertext');
    }

    if ('key_fingerprint' in sanitized) {
      throw new Error('sanitizeWorkspace must remove key_fingerprint');
    }

    if ('encryption_version' in sanitized) {
      throw new Error('sanitizeWorkspace must remove encryption_version');
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
    console.log(`${GREEN}Pillar 5 verification complete. Anti-leak mesh is secure.${RESET}`);
    console.log(`${GREEN}Phase 30 Security Hardening COMPLETE. 🎉${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}✗ TESTS FAILED (${passed} passed, ${failed} failed)${RESET}\n`);
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    console.log(`\n${RED}Fix errors before finalizing Pillar 5.${RESET}\n`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});
