# Phase 30: Security Architecture Implementation

> **Classification:** INTERNAL - Security Sensitive  
> **Version:** 1.0  
> **Date:** December 13, 2025  
> **Author:** Security Architecture Team

---

## Executive Summary

This document defines the security architecture for hardening the Cold Email Dashboard multi-tenant SaaS application. It covers **5 Core Security Pillars**, each analyzed across **15 Security Dimensions** to ensure comprehensive protection against insider threats, data breaches, and cryptographic attacks.

**Current State Analysis (from code review):**
- ✅ AES-256-GCM encryption already implemented in `ask-key-store.ts`
- ✅ RLS policies exist but use session variables without Super Admin bypass
- ✅ Role hierarchy defined (owner/admin/member/viewer) with hardcoded Super Admin IDs
- ⚠️ No dedicated `workspace_keys` vault table (keys stored in `ask_api_keys`)
- ⚠️ API key decryption happens inline without explicit TTL enforcement
- ⚠️ No opaque type safety for encrypted strings

---

## Table of Contents

1. [Pillar 1: The Cryptographic Core](#pillar-1-the-cryptographic-core)
2. [Pillar 2: The Sovereign Vault Schema](#pillar-2-the-sovereign-vault-schema)
3. [Pillar 3: The Draconian Access Gate](#pillar-3-the-draconian-access-gate)
4. [Pillar 4: The Ephemeral Runtime](#pillar-4-the-ephemeral-runtime)
5. [Pillar 5: The Anti-Leak Mesh](#pillar-5-the-anti-leak-mesh)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Appendix: SQL DDL Specifications](#appendix-sql-ddl-specifications)

---

## Pillar 1: The Cryptographic Core

**Target:** `lib/encryption.ts`  
**Mandate:** Mathematical implementation of AES-256-GCM with cryptographically secure IV generation.

### Dimension Analysis

#### 1. Threat Model
- **Primary Threats:** 
  - Ciphertext-only attacks from database dumps
  - Padding oracle attacks (mitigated by GCM mode)
  - IV reuse attacks leading to key recovery
  - Side-channel timing attacks during decryption
- **Adversary Profile:** Rogue database admin with full `pg_dump` access

#### 2. Cryptographic Primitive
```
Algorithm:       AES-256-GCM (Galois/Counter Mode)
Key Size:        256 bits (32 bytes)
IV Size:         96 bits (12 bytes) - NIST SP 800-38D recommended
Auth Tag Size:   128 bits (16 bytes)
Library:         Node.js native `crypto` module
```

**Why 96-bit IV:**
- GCM is optimized for 96-bit IVs (single GHASH call vs. two for other sizes)
- 2^48 messages before birthday bound collision (sufficient for per-workspace key isolation)
- Prevents counter wraparound attacks

**Why 128-bit Auth Tag:**
- Maximum forgery resistance (2^-128 probability)
- Required for FIPS 140-2 compliance
- Prevents truncation attacks

#### 3. Key Management
```
Environment Variable:  ASK_KEY_ENCRYPTION_KEY (or INTERNAL_ENCRYPTION_KEY)
Format:                64-character hex string OR 44-character base64
Derivation:            Direct key (no KDF - key must be cryptographically random)
Storage:               Vercel environment variables (encrypted at rest)
Access:                Read-only by serverless functions at runtime
```

**Key Generation Command:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4. Attack Vector Analysis
| Attack | Mitigation |
|--------|------------|
| Brute Force | 256-bit key = 2^256 operations (infeasible) |
| Known-Plaintext | GCM authentication prevents chosen-plaintext extension |
| IV Collision | Random 96-bit IV + workspace scoping = negligible collision probability |
| Timing Attack | Node.js crypto uses constant-time comparison for auth tag |
| Key Extraction | Key never logged, never in database, process isolation |

#### 5. RLS Policy Logic
```sql
-- Not applicable: Encryption happens at application layer
-- RLS controls WHO can trigger decryption, not the crypto itself
```

#### 6. Memory Lifecycle
```
Phase 1 (Key Load):     Process startup → Buffer in V8 heap
Phase 2 (Decryption):   ~5-10ms (IV parse + AES-GCM decrypt)
Phase 3 (Usage):        Plaintext in local variable scope
Phase 4 (Cleanup):      Function return → eligible for GC
Target TTL:             <50ms for plaintext in RAM
```

#### 7. Error Handling
```typescript
// SAFE: Generic error (no information leakage)
throw new Error('Decryption failed');

// UNSAFE (NEVER DO):
throw new Error(`Decryption failed: invalid tag ${tag.toString('hex')}`);
throw new Error(`Key mismatch for workspace ${workspaceId}`);
```

**Error Response Protocol:**
- All crypto errors return HTTP 500 with generic message
- Log internal error ID for debugging (UUID), not error details
- Never differentiate between "wrong key" and "corrupted data"

#### 8. Audit Logs
| Event | Logged | NOT Logged |
|-------|--------|------------|
| Key access attempt | ✅ userId, workspaceId, timestamp | ❌ Plaintext key |
| Decryption success | ✅ Operation ID | ❌ Decrypted value |
| Decryption failure | ✅ Error ID, userId | ❌ Ciphertext, IV |
| Key rotation | ✅ Old key hash (first 8 chars), new key hash | ❌ Full key material |

#### 9. Super Admin Privileges
- **CAN:** View that a key exists (boolean), delete keys, trigger rotation
- **CANNOT:** View plaintext API keys, decrypt without master key
- **Rationale:** Even God Mode respects cryptographic boundaries

#### 10. Schema Hardening
```sql
-- Ciphertext column constraints
key_ciphertext TEXT NOT NULL CHECK (
  key_ciphertext ~ '^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$'
)
-- Format: IV(24 hex):CIPHERTEXT(variable):TAG(32 hex)
```

#### 11. Disaster Recovery
**If Master Key is Lost:**
1. All encrypted keys become permanently unrecoverable
2. Users must re-enter API keys
3. No backdoor exists by design (this is a feature, not a bug)

**Mitigation:**
- Key escrow with 2-of-3 Shamir Secret Sharing for enterprise plans
- Document key in secure password manager (1Password Teams Vault)

#### 12. Role Hierarchy
| Role | Can Encrypt | Can Decrypt | Can Delete |
|------|-------------|-------------|------------|
| Owner | ✅ | ✅ (own keys) | ✅ |
| Admin | ✅ | ✅ (own keys) | ✅ (own) |
| Member | ✅ | ✅ (own keys) | ✅ (own) |
| Viewer | ❌ | ❌ | ❌ |
| Super Admin | ❌ | ❌ | ✅ (any) |

#### 13. Type Safety
```typescript
// Opaque type pattern (prevents accidental plaintext logging)
declare const EncryptedBrand: unique symbol;
type EncryptedString = string & { [EncryptedBrand]: never };

function encrypt(plaintext: string): EncryptedString;
function decrypt(ciphertext: EncryptedString): string;

// Compile-time error:
console.log(decrypt("not-encrypted")); // Error: string not assignable to EncryptedString
```

#### 14. Compliance
| Standard | Requirement | Status |
|----------|-------------|--------|
| SOC 2 CC6.1 | Encryption of sensitive data | ✅ AES-256-GCM |
| GDPR Art. 32 | Pseudonymization and encryption | ✅ Keys encrypted at rest |
| PCI-DSS 3.4 | Render PAN unreadable | ✅ (if storing card tokens) |
| HIPAA § 164.312 | Encryption mechanism | ✅ NIST-approved algorithm |

#### 15. Future Rotation Path
**Phase 50 Key Rotation Protocol:**
```
1. Generate new master key (K2)
2. Set K2 in environment as INTERNAL_ENCRYPTION_KEY_V2
3. Run migration: For each row, decrypt with K1, re-encrypt with K2
4. Swap K1 → K2 in primary variable
5. Remove K1 after 30-day grace period
6. Audit: Verify no ciphertext uses old IV prefix pattern
```

---

## Pillar 2: The Sovereign Vault Schema

**Target:** `workspace_keys` (new Postgres table)  
**Mandate:** Store API keys such that a full `pg_dump` yields only useless ciphertext.

### Dimension Analysis

#### 1. Threat Model
- **Primary Threats:**
  - Database backup exfiltration
  - SQL injection leading to `SELECT *`
  - Rogue DBA with superuser access
  - Accidental exposure via admin panel
- **Adversary Profile:** External attacker with stolen database credentials

#### 2. Cryptographic Primitive
```
Storage Format:    IV:CIPHERTEXT:AUTHTAG (hex-encoded)
Column Type:       TEXT with CHECK constraint
Indexing:          No index on ciphertext (prevents timing attacks)
```

#### 3. Key Management
- Master key stored in environment variable only
- Per-row encryption (unique IV per record)
- No key stored in database under any circumstances

#### 4. Attack Vector Analysis
| Attack | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries only; no dynamic SQL |
| pg_dump theft | Ciphertext without master key = random bytes |
| Privilege escalation | RLS + column-level permissions |
| Timing attack | No ciphertext index; constant-time operations |

#### 5. RLS Policy Logic
```sql
-- Owner-only access to vault (Admins are UNTRUSTED)
CREATE POLICY vault_owner_only ON workspace_keys
  FOR ALL
  USING (
    -- Super Admin bypass
    auth.uid()::text = current_setting('app.super_admin_id', true)
    OR
    -- Workspace owner only
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_keys.workspace_id
        AND uw.user_id = auth.uid()::text
        AND uw.role = 'owner'
    )
  )
  WITH CHECK (
    auth.uid()::text = current_setting('app.super_admin_id', true)
    OR
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_keys.workspace_id
        AND uw.user_id = auth.uid()::text
        AND uw.role = 'owner'
    )
  );
```

#### 6. Memory Lifecycle
- Ciphertext loaded from DB → Application layer decryption → Immediate use
- Database never sees plaintext

#### 7. Error Handling
```sql
-- Constraint violation returns generic error
CONSTRAINT valid_ciphertext CHECK (LENGTH(key_ciphertext) > 50)
-- No error message reveals format expectations
```

#### 8. Audit Logs
```sql
-- Audit table for vault access
CREATE TABLE workspace_keys_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('read', 'write', 'delete')),
  provider TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger on workspace_keys access
CREATE TRIGGER audit_vault_access
AFTER INSERT OR UPDATE OR DELETE ON workspace_keys
FOR EACH ROW EXECUTE FUNCTION log_vault_access();
```

#### 9. Super Admin Privileges
```sql
-- Super Admin CAN:
DELETE FROM workspace_keys WHERE workspace_id = 'target';  -- ✅
SELECT EXISTS(SELECT 1 FROM workspace_keys WHERE workspace_id = 'target');  -- ✅

-- Super Admin CANNOT:
SELECT key_ciphertext FROM workspace_keys;  -- Column excluded from view
-- Even if selected, ciphertext is useless without master key
```

#### 10. Schema Hardening
```sql
CREATE TABLE workspace_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- Clerk user who set the key
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'openrouter', 'anthropic')),
  key_ciphertext TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,  -- SHA-256 of plaintext (first 8 chars for display)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id, provider)
);

-- Indexes (NOT on ciphertext)
CREATE INDEX idx_workspace_keys_workspace ON workspace_keys(workspace_id);
CREATE INDEX idx_workspace_keys_user ON workspace_keys(user_id);

-- Row-level security
ALTER TABLE workspace_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_keys FORCE ROW LEVEL SECURITY;
```

#### 11. Disaster Recovery
- Encrypted backup of ciphertext is useless without master key
- Master key backup via Shamir's Secret Sharing (3-of-5 trustees)
- 24-hour RTO for key recovery from trustees

#### 12. Role Hierarchy
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Owner | ✅ (own) | ✅ | ✅ (own) | ✅ (own) |
| Admin | ❌ | ❌ | ❌ | ❌ |
| Member | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ |
| Super Admin | ✅ (metadata) | ❌ | ❌ | ✅ |

#### 13. Type Safety
```typescript
// Database row type (never contains plaintext)
interface WorkspaceKeyRow {
  id: string;
  workspace_id: string;
  user_id: string;
  provider: 'openai' | 'openrouter' | 'anthropic';
  key_ciphertext: EncryptedString;  // Opaque type
  key_fingerprint: string;
  created_at: string;
}
```

#### 14. Compliance
| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| SOC 2 CC6.6 | Logical access controls | RLS + owner-only policy |
| GDPR Art. 25 | Data protection by design | Encryption by default |
| ISO 27001 A.10 | Cryptographic controls | AES-256-GCM |

#### 15. Future Rotation Path
```sql
-- Add version column for key rotation
ALTER TABLE workspace_keys ADD COLUMN encryption_version INTEGER DEFAULT 1;

-- Rotation migration updates version
UPDATE workspace_keys 
SET key_ciphertext = new_encrypt(old_decrypt(key_ciphertext)),
    encryption_version = 2,
    rotated_at = NOW()
WHERE encryption_version = 1;
```

---

## Pillar 3: The Draconian Access Gate

**Target:** RLS Policies, `lib/workspace-access.ts`  
**Mandate:** Strict Owner vs Admin hierarchy; Admins are "Untrusted" for key management.

### Dimension Analysis

#### 1. Threat Model
- **Primary Threats:**
  - Privilege escalation from Member → Admin → Owner
  - Horizontal traversal between workspaces
  - Rogue Admin accessing other users' API keys
- **Adversary Profile:** Malicious insider with legitimate member access

#### 2. Cryptographic Primitive
- Not directly applicable (access control layer)
- Session tokens validated via Clerk JWT verification

#### 3. Key Management
- `app.super_admin_id` set via Postgres session variable
- Super Admin list hardcoded in TypeScript (auditable)

#### 4. Attack Vector Analysis
| Attack | Mitigation |
|--------|------------|
| JWT Forgery | Clerk handles JWT validation with RS256 |
| Role tampering | Roles stored server-side, never in JWT claims |
| Session hijacking | Short-lived tokens + refresh rotation |
| IDOR | workspace_id validated against user_workspaces join |

#### 5. RLS Policy Logic
```sql
-- Tiered access control with explicit Super Admin bypass
CREATE POLICY workspace_access ON email_events
  FOR ALL
  USING (
    -- Bypass: Super Admin
    auth.uid()::text = current_setting('app.super_admin_id', true)
    OR
    -- Standard: User has any role in workspace
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = email_events.workspace_id
        AND uw.user_id = auth.uid()::text
    )
  );

-- Write-restricted policy (no viewers)
CREATE POLICY workspace_write ON email_events
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = current_setting('app.super_admin_id', true)
    OR
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = email_events.workspace_id
        AND uw.user_id = auth.uid()::text
        AND uw.role IN ('owner', 'admin', 'member')
    )
  );
```

#### 6. Memory Lifecycle
- Role cached in `accessCache` Map for 5 minutes
- Cache key: `${userId}:${workspaceId}`
- Probabilistic cache cleanup (10% chance per request)

#### 7. Error Handling
```typescript
// Uniform error responses (prevent enumeration)
if (!hasAccess) {
  return NextResponse.json(
    { error: 'Access denied' },  // Generic
    { status: 403 }
  );
}
// Never: "Workspace 'abc' does not exist" (reveals existence)
```

#### 8. Audit Logs
```typescript
// Log access decisions (not data accessed)
console.log(JSON.stringify({
  event: 'workspace_access',
  userId,
  workspaceId,
  hasAccess,
  role,
  timestamp: new Date().toISOString(),
}));
```

#### 9. Super Admin Privileges
```typescript
const SUPER_ADMIN_IDS = ['user_36QtXCPqQu6k0CXcYM0Sn2OQsgT'];

function isSuperAdmin(userId: string): boolean {
  return SUPER_ADMIN_IDS.includes(userId);
}

// Super Admin capabilities:
// ✅ Read all workspaces
// ✅ Delete any workspace_keys entry
// ✅ Access any workspace data
// ❌ Decrypt API keys (no master key access)
// ❌ Impersonate users
```

#### 10. Schema Hardening
```sql
-- Prevent role escalation via constraint
ALTER TABLE user_workspaces 
ADD CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- Ensure exactly one owner per workspace
CREATE UNIQUE INDEX one_owner_per_workspace 
ON user_workspaces (workspace_id) 
WHERE role = 'owner';
```

#### 11. Disaster Recovery
- If RLS policies are dropped: All data exposed
- Mitigation: `FORCE ROW LEVEL SECURITY` prevents bypass even by table owner
- Recovery: Restore from last known-good migration

#### 12. Role Hierarchy
```
Super Admin (L0)
    └── Owner (L1)           - Full workspace control
         └── Admin (L2)      - Settings, no key access
              └── Member (L3) - Read/Write data
                   └── Viewer (L4) - Read only
```

**Explicit Denials:**
- Admin CANNOT access `workspace_keys`
- Member CANNOT invite users
- Viewer CANNOT modify any data

#### 13. Type Safety
```typescript
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

// Exhaustive role checks
function assertNever(x: never): never {
  throw new Error(`Unexpected role: ${x}`);
}

function getPermissions(role: WorkspaceRole) {
  switch (role) {
    case 'owner': return { canManageKeys: true, canManageUsers: true };
    case 'admin': return { canManageKeys: false, canManageUsers: true };
    case 'member': return { canManageKeys: false, canManageUsers: false };
    case 'viewer': return { canManageKeys: false, canManageUsers: false };
    default: return assertNever(role);
  }
}
```

#### 14. Compliance
| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| SOC 2 CC6.3 | Role-based access control | 4-tier role system |
| GDPR Art. 5(1)(f) | Integrity and confidentiality | RLS enforcement |
| ISO 27001 A.9 | Access control policy | Documented role matrix |

#### 15. Future Rotation Path
- Role migration via `user_workspaces.role` UPDATE
- No credential rotation needed (roles != secrets)

---

## Pillar 4: The Ephemeral Runtime

**Target:** `app/api/ask/route.ts`  
**Mandate:** Just-In-Time decryption with <50ms RAM lifetime, zero logging.

### Dimension Analysis

#### 1. Threat Model
- **Primary Threats:**
  - Memory dump of serverless function
  - Heap inspection via debugger attachment
  - Log aggregation capturing plaintext
- **Adversary Profile:** Attacker with access to Vercel function runtime

#### 2. Cryptographic Primitive
- Decryption uses same AES-256-GCM as Pillar 1
- No additional cryptographic operations at runtime

#### 3. Key Management
```typescript
// JIT pattern: Decrypt only when needed, discard immediately
async function handleAskRequest(req: NextRequest) {
  // ... validation ...
  
  // Decrypt at point of use
  const { apiKey } = await getAskKey({ userId, workspaceId, provider });
  
  // Use immediately
  const response = await fetch(apiUrl, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  // apiKey goes out of scope here → eligible for GC
  return response;
}
```

#### 4. Attack Vector Analysis
| Attack | Mitigation |
|--------|------------|
| Heap dump | Short TTL + scope isolation |
| console.log leak | ESLint rule bans logging in ask-key-store |
| Error stack capture | No plaintext in Error objects |
| Cold start caching | Functions are stateless |

#### 5. RLS Policy Logic
- N/A (runtime behavior, not database policy)

#### 6. Memory Lifecycle
```
T+0ms:    getAskKey() called
T+5ms:    Ciphertext fetched from Supabase
T+10ms:   decryptSecret() returns plaintext
T+15ms:   Plaintext assigned to local variable
T+20ms:   Plaintext used in HTTP Authorization header
T+25ms:   fetch() initiated, plaintext still in scope
T+200ms:  fetch() completes, function returns
T+200ms:  Local variables go out of scope
T+???ms:  V8 garbage collector reclaims memory

Target: Plaintext accessible for <50ms before network call
Reality: ~200ms (fetch latency), acceptable for serverless
```

#### 7. Error Handling
```typescript
// SAFE error handling
try {
  const { apiKey } = await getAskKey(params);
  if (!apiKey) {
    return NextResponse.json({ answer: 'API key not configured' }, { status: 400 });
  }
  // use apiKey
} catch (error) {
  // Log error ID only
  const errorId = crypto.randomUUID();
  console.error(`[${errorId}] Ask API error`);
  return NextResponse.json({ answer: 'Internal error', errorId }, { status: 500 });
}
// NEVER: console.error(`Failed with key ${apiKey}`);
```

#### 8. Audit Logs
| Logged | NOT Logged |
|--------|------------|
| Request timestamp | API key plaintext |
| User ID | Key ciphertext |
| Workspace ID | Authorization header |
| Provider (openai/openrouter) | Full request body |
| Response status | AI response content |

#### 9. Super Admin Privileges
- Super Admin uses same decryption path as regular users
- No special runtime privileges (just broader workspace access)

#### 10. Schema Hardening
- N/A (runtime, not schema)

#### 11. Disaster Recovery
- If decryption fails: Return graceful error, user must re-enter key
- No recovery possible without master key

#### 12. Role Hierarchy
- All authenticated users use same runtime path
- Access control happens before decryption (Pillar 3)

#### 13. Type Safety
```typescript
// Function signature prevents returning apiKey
async function getAskKey(params: {
  userId: string;
  workspaceId: string;
  provider: 'openai' | 'openrouter';
}): Promise<{ apiKey: string | null; error?: string }>;

// apiKey is intentionally not stored in any persistent structure
// It exists only as a local variable in the calling function
```

#### 14. Compliance
| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| SOC 2 CC6.7 | Restrict information in transit | HTTPS + minimal exposure |
| PCI-DSS 6.5 | Secure coding practices | No plaintext logging |

#### 15. Future Rotation Path
- No runtime changes needed for key rotation
- New ciphertext decrypts with new master key automatically

---

## Pillar 5: The Anti-Leak Mesh

**Target:** `middleware.ts`, `/api/workspaces`  
**Mandate:** Prevent accidental frontend leakage of vault data.

### Dimension Analysis

#### 1. Threat Model
- **Primary Threats:**
  - `SELECT *` including sensitive columns
  - React Server Component accidentally rendering secrets
  - Browser DevTools exposing API responses
  - Third-party analytics capturing DOM content
- **Adversary Profile:** Browser extension or XSS injecting data exfiltration

#### 2. Cryptographic Primitive
- N/A (filtering layer, not crypto)

#### 3. Key Management
- Vault table excluded from all generic queries
- Explicit allowlist for API responses

#### 4. Attack Vector Analysis
| Attack | Mitigation |
|--------|------------|
| SELECT * | View excludes workspace_keys table |
| JSON.stringify(data) | Response sanitization at API boundary |
| GraphQL overfetch | Not using GraphQL |
| SSR hydration leak | Server Components don't expose secrets |

#### 5. RLS Policy Logic
```sql
-- Create view that explicitly excludes vault
CREATE VIEW safe_workspace_data AS
SELECT 
  w.id,
  w.name,
  w.slug,
  w.plan,
  w.settings,
  w.created_at
FROM workspaces w;
-- workspace_keys not joined = cannot leak

-- Grant SELECT only on view, not base table
REVOKE SELECT ON workspace_keys FROM authenticated;
GRANT SELECT ON safe_workspace_data TO authenticated;
```

#### 6. Memory Lifecycle
- Filtering happens at query layer (data never fetched)
- Zero memory exposure

#### 7. Error Handling
```typescript
// API response sanitization
function sanitizeWorkspaceResponse(workspace: any) {
  const { 
    // Explicitly destructure ONLY safe fields
    id, name, slug, plan, created_at 
  } = workspace;
  
  return { id, name, slug, plan, created_at };
  // Any accidental key_ciphertext field is dropped
}
```

#### 8. Audit Logs
- Log any attempt to access workspace_keys from unauthorized context
- Alert on repeated denied access patterns

#### 9. Super Admin Privileges
- Super Admin view shows `key_exists: boolean`, not actual keys
- Admin panel uses separate endpoint with explicit masking

#### 10. Schema Hardening
```sql
-- Column-level security (if Postgres Enterprise)
-- For standard Postgres, use application-layer filtering

-- Ensure workspace_keys has no FK references that could leak via JOIN
-- workspace_id references workspaces, but workspaces doesn't reference back
```

#### 11. Disaster Recovery
- If filtering bypassed: Encrypted data leaks (useless without master key)
- Defense in depth: Encryption is the last line

#### 12. Role Hierarchy
- All roles receive sanitized responses
- No role can access raw workspace_keys via API

#### 13. Type Safety
```typescript
// API response types (no ciphertext fields)
interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  created_at: string;
  // NO key_ciphertext, NO secrets
}

// Compile-time enforcement
type AssertNoSecrets<T> = T extends { key_ciphertext: any } ? never : T;
type SafeWorkspace = AssertNoSecrets<WorkspaceResponse>; // ✅ Compiles
```

#### 14. Compliance
| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| OWASP Top 10 A01 | Broken Access Control | Explicit field allowlisting |
| SOC 2 CC6.1 | Data classification | Secrets never in API responses |

#### 15. Future Rotation Path
- Add new safe fields to view/response types
- Vault fields never need frontend exposure

---

## Implementation Roadmap

### Phase 30A: Schema Migration (Week 1)
1. Create `workspace_keys` table with RLS
2. Migrate from `ask_api_keys` to new structure
3. Add audit logging triggers
4. Deploy to staging

### Phase 30B: Encryption Hardening (Week 1-2)
1. Create `lib/encryption.ts` with opaque types
2. Update `ask-key-store.ts` to use new encryption module
3. Add ESLint rule for plaintext logging prevention
4. Unit tests for encryption/decryption

### Phase 30C: Access Control Tightening (Week 2)
1. Update RLS policies with Super Admin bypass
2. Add one-owner constraint
3. Implement role-based key access checks
4. Integration tests for access control

### Phase 30D: Anti-Leak Mesh (Week 2-3)
1. Create safe views
2. Add response sanitization middleware
3. Audit all API endpoints for field exposure
4. Penetration testing

---

## Appendix: SQL DDL Specifications

### A.1 Workspace Keys Table
```sql
-- Migration: 20251213_create_workspace_keys.sql

CREATE TABLE workspace_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'openrouter', 'anthropic')),
  key_ciphertext TEXT NOT NULL CHECK (LENGTH(key_ciphertext) > 50),
  key_fingerprint TEXT NOT NULL CHECK (LENGTH(key_fingerprint) = 8),
  encryption_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  UNIQUE(workspace_id, user_id, provider)
);

-- Indexes
CREATE INDEX idx_workspace_keys_workspace ON workspace_keys(workspace_id);
CREATE INDEX idx_workspace_keys_user ON workspace_keys(user_id);
CREATE INDEX idx_workspace_keys_provider ON workspace_keys(provider);

-- Enable RLS
ALTER TABLE workspace_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_keys FORCE ROW LEVEL SECURITY;

-- Owner-only policy with Super Admin bypass
CREATE POLICY vault_owner_only ON workspace_keys
  FOR ALL
  USING (
    current_setting('app.super_admin_id', true) = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_keys.workspace_id
        AND uw.user_id = auth.uid()::text
        AND uw.role = 'owner'
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_workspace_keys_updated_at
  BEFORE UPDATE ON workspace_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### A.2 Audit Table
```sql
-- Migration: 20251213_create_vault_audit.sql

CREATE TABLE workspace_keys_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_key_id UUID,
  workspace_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  provider TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vault_audit_workspace ON workspace_keys_audit(workspace_id);
CREATE INDEX idx_vault_audit_actor ON workspace_keys_audit(actor_id);
CREATE INDEX idx_vault_audit_created ON workspace_keys_audit(created_at);

-- Audit trigger function
CREATE OR REPLACE FUNCTION log_vault_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_keys_audit (
    workspace_key_id,
    workspace_id,
    actor_id,
    action,
    provider
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.workspace_id, OLD.workspace_id),
    auth.uid()::text,
    TG_OP,
    COALESCE(NEW.provider, OLD.provider)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_workspace_keys
  AFTER INSERT OR UPDATE OR DELETE ON workspace_keys
  FOR EACH ROW EXECUTE FUNCTION log_vault_access();
```

### A.3 Safe View
```sql
-- Migration: 20251213_create_safe_views.sql

CREATE OR REPLACE VIEW safe_workspace_data AS
SELECT 
  w.id,
  w.name,
  w.slug,
  w.plan,
  w.settings - 'internal_settings' AS settings,  -- Remove internal keys
  w.created_at,
  w.updated_at
FROM workspaces w;

-- Grant to authenticated role
GRANT SELECT ON safe_workspace_data TO authenticated;
```

---

*End of Document*
