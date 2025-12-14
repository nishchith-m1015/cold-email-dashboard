-- ============================================
-- PHASE 30 - PILLAR 2: SOVEREIGN VAULT SCHEMA
-- Migration: Create workspace_keys table
-- ============================================
-- 
-- This migration creates the secure vault for encrypted API keys.
-- Security properties:
-- - Ciphertext-only storage (useless without master key)
-- - Owner-only access via RLS
-- - Audit trail for all access
-- - Format validation constraints
-- 
-- Dependencies: Requires workspaces table and user_workspaces table
-- 
-- Apply with: psql <connection-string> -f supabase/migrations/20251213_create_workspace_keys.sql
-- ============================================

-- ============================================
-- HELPER FUNCTION: update_updated_at_column
-- ============================================
-- Ensures updated_at timestamp is automatically maintained

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE: workspace_keys (The Vault)
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace association
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Owner of this key (Clerk user ID)
  user_id TEXT NOT NULL,
  
  -- Provider type
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'openrouter', 'anthropic')),
  
  -- Encrypted API key (IV:CIPHERTEXT:AUTHTAG format)
  key_ciphertext TEXT NOT NULL CHECK (
    LENGTH(key_ciphertext) > 50 
    AND key_ciphertext ~ '^[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$'
  ),
  
  -- SHA-256 fingerprint (first 8 chars for display)
  key_fingerprint TEXT NOT NULL CHECK (
    LENGTH(key_fingerprint) = 8 
    AND key_fingerprint ~ '^[0-9a-f]{8}$'
  ),
  
  -- Encryption version (for future key rotation)
  encryption_version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  
  -- One key per workspace/user/provider combination
  UNIQUE(workspace_id, user_id, provider)
);

-- ============================================
-- INDEXES (NOT on sensitive columns)
-- ============================================
-- Note: We deliberately do NOT index key_ciphertext to prevent timing attacks

CREATE INDEX idx_workspace_keys_workspace ON workspace_keys(workspace_id);
CREATE INDEX idx_workspace_keys_user ON workspace_keys(user_id);
CREATE INDEX idx_workspace_keys_provider ON workspace_keys(provider);
CREATE INDEX idx_workspace_keys_created ON workspace_keys(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE workspace_keys ENABLE ROW LEVEL SECURITY;

-- Force RLS (even for table owner)
ALTER TABLE workspace_keys FORCE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS vault_owner_only ON workspace_keys;

-- Owner-only policy with Super Admin bypass
CREATE POLICY vault_owner_only ON workspace_keys
  FOR ALL
  USING (
    -- Bypass: Super Admin (set via session variable)
    current_setting('app.super_admin_id', true) = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    -- Standard: Workspace owner only (Admins are UNTRUSTED)
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_keys.workspace_id
        AND uw.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND uw.role = 'owner'
    )
  )
  WITH CHECK (
    -- Same rules for INSERT/UPDATE
    current_setting('app.super_admin_id', true) = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    EXISTS (
      SELECT 1 FROM user_workspaces uw
      WHERE uw.workspace_id = workspace_keys.workspace_id
        AND uw.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND uw.role = 'owner'
    )
  );

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================

CREATE TRIGGER update_workspace_keys_updated_at
  BEFORE UPDATE ON workspace_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE workspace_keys IS 'Secure vault for encrypted API keys. Ciphertext is useless without master key stored in INTERNAL_ENCRYPTION_KEY env var.';
COMMENT ON COLUMN workspace_keys.key_ciphertext IS 'AES-256-GCM encrypted API key. Format: IV(24 hex):CIPHERTEXT(variable):TAG(32 hex)';
COMMENT ON COLUMN workspace_keys.key_fingerprint IS 'SHA-256 hash of plaintext (first 8 chars). For display purposes only.';
COMMENT ON COLUMN workspace_keys.encryption_version IS 'Key rotation version. Increment during re-encryption migrations.';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Revoke all public access
REVOKE ALL ON workspace_keys FROM PUBLIC;

-- Grant authenticated users access (RLS will filter)
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_keys TO authenticated;
