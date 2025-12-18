# Phase 30 Quick Reference

## Verification Commands

```bash
# Pillar 4: Ephemeral Runtime
npx tsx scripts/verify-ephemeral-runtime.ts

# Pillar 5: Anti-Leak Mesh
npx tsx scripts/verify-anti-leak-mesh.ts

# Run all verifications
npx tsx scripts/verify-ephemeral-runtime.ts && npx tsx scripts/verify-anti-leak-mesh.ts
```

## Database Migrations (Apply in Order)

```bash
# 1. Create workspace_keys table
psql -f supabase/migrations/20251213_create_workspace_keys.sql

# 2. Enable RLS on all tables
psql -f supabase/migrations/20251213_enable_rls_policies.sql

# 3. Create safe workspace views
psql -f supabase/migrations/20251213_create_safe_views.sql
```

## Common Operations

### Store API Key (Owner Only)

```typescript
import { setAskKey } from '@/lib/ask-key-store';

await setAskKey({
  userId: currentUser.id,
  workspaceId: 'ws_abc',
  provider: 'openai',
  apiKey: 'sk-proj-...',
});
```

### Retrieve API Key (JIT Decryption)

```typescript
import { getAskKey } from '@/lib/ask-key-store';

const { apiKey } = await getAskKey({
  userId: currentUser.id,
  workspaceId: 'ws_abc',
  provider: 'openai',
});

// Use immediately
const response = await fetch('https://api.openai.com/v1/...', {
  headers: { Authorization: `Bearer ${apiKey}` }
});
// apiKey out of scope after this point
```

### Check Permissions

```typescript
import { getWorkspaceAccess, requireWorkspaceAccess } from '@/lib/workspace-access';

// Method 1: Check permissions
const access = await getWorkspaceAccess(userId, workspaceId);
if (access?.canManageKeys) {
  // Owner only - can manage API keys
}

// Method 2: Require permission (throws if denied)
await requireWorkspaceAccess(workspaceId, 'canManageKeys');
// Execution continues only if user is owner
```

### Sanitize API Responses

```typescript
import { sanitizeWorkspace, sanitizeWorkspaces } from '@/lib/response-sanitizer';

// Single workspace
const workspace = await fetchWorkspace(id);
const safe = sanitizeWorkspace(workspace);
return NextResponse.json({ workspace: safe });

// Multiple workspaces
const workspaces = await fetchWorkspaces();
const safe = sanitizeWorkspaces(workspaces);
return NextResponse.json({ workspaces: safe });
```

## Role Permissions Matrix

| Permission | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| canRead | ✅ | ✅ | ✅ | ✅ |
| canWrite | ✅ | ✅ | ✅ | ❌ |
| canManage | ✅ | ✅ | ❌ | ❌ |
| canManageKeys | ✅ | ❌ | ❌ | ❌ |
| canDelete | ✅ | ❌ | ❌ | ❌ |

**Critical:** Only owners can manage API keys. Admins are UNTRUSTED for vault operations.

## Security Checklist

### Before Deploying

- [ ] Run all verification scripts (Pillar 4 & 5)
- [ ] Apply all database migrations
- [ ] Set `INTERNAL_ENCRYPTION_KEY` environment variable (32 bytes, hex or base64)
- [ ] Verify RLS is enabled on all tables
- [ ] Test key operations with different roles
- [ ] Review audit logs for any anomalies

### Production Environment Variables

```bash
# Required
INTERNAL_ENCRYPTION_KEY=<64-char-hex-string>  # 32 bytes for AES-256
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Optional (for AI features)
OPENAI_API_KEY=<fallback-key>
OPENROUTER_API_KEY=<fallback-key>
```

## Troubleshooting

### "Encryption key not configured"

- Set `INTERNAL_ENCRYPTION_KEY` environment variable
- Must be 32 bytes (64 hex chars or 44 base64 chars)
- Generate: `openssl rand -hex 32`

### "Access denied" for key operations

- Verify user is workspace owner (not admin)
- Check `user_workspaces` table for correct role
- Super Admin users (see `SUPER_ADMIN_IDS` in `workspace-access.ts`) bypass all checks

### "Safe view not found"

- Apply migration: `supabase/migrations/20251213_create_safe_views.sql`
- Verify view exists: `SELECT * FROM safe_workspace_data LIMIT 1;`

### Verification tests failing

- Check file paths are correct (migrations, lib files)
- Ensure all imports are working (`npm install`)
- Review specific test error message for details

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Pillar 1: Sovereign Vault Schema               │
│  workspace_keys table + RLS + audit             │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Pillar 2: Cryptographic Core                   │
│  AES-256-GCM encryption (lib/encryption.ts)     │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Pillar 3: Draconian Access Gate                │
│  Role-based access + RLS policies               │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Pillar 4: Ephemeral Runtime                    │
│  JIT decryption + <10ms plaintext lifetime      │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│  Pillar 5: Anti-Leak Mesh                       │
│  Response sanitization + safe views             │
└─────────────────────────────────────────────────┘
```

## Support

For detailed documentation, see:
- [PHASE_30_COMPLETE.md](./PHASE_30_COMPLETE.md) - Full implementation details
- [PHASE_30_SECURITY_ARCHITECTURE.md](./PHASE_30_SECURITY_ARCHITECTURE.md) - Original design doc

For issues or questions:
1. Run verification scripts first
2. Check troubleshooting section above
3. Review audit logs for access patterns
4. Consult security documentation
