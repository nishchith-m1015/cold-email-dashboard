-- ============================================
-- PHASE 30 - PILLAR 2: SCHEMA HARDENING
-- Migration: Add one-owner constraint
-- ============================================
-- 
-- This migration enforces that each workspace has exactly one owner.
-- Prevents privilege escalation scenarios.
-- 
-- Apply with: psql <connection-string> -f supabase/migrations/20251213_enforce_one_owner.sql
-- ============================================

-- ============================================
-- CONSTRAINT: One owner per workspace
-- ============================================

-- Drop existing index if present
DROP INDEX IF EXISTS one_owner_per_workspace;

-- Create partial unique index: only one 'owner' role per workspace
CREATE UNIQUE INDEX one_owner_per_workspace 
ON user_workspaces (workspace_id) 
WHERE role = 'owner';

-- ============================================
-- CONSTRAINT: Valid roles only
-- ============================================

-- Add constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_role' 
    AND conrelid = 'user_workspaces'::regclass
  ) THEN
    ALTER TABLE user_workspaces 
    ADD CONSTRAINT valid_role 
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
  END IF;
END $$;

-- ============================================
-- FUNCTION: Validate owner transfer
-- ============================================

CREATE OR REPLACE FUNCTION validate_owner_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- If changing FROM owner TO something else, ensure another owner exists
  IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_workspaces
      WHERE workspace_id = OLD.workspace_id
        AND role = 'owner'
        AND user_id <> OLD.user_id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last owner. Transfer ownership first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Prevent orphaned workspaces
-- ============================================

DROP TRIGGER IF EXISTS prevent_orphaned_workspace ON user_workspaces;

CREATE TRIGGER prevent_orphaned_workspace
  BEFORE UPDATE ON user_workspaces
  FOR EACH ROW
  WHEN (OLD.role = 'owner' AND NEW.role <> 'owner')
  EXECUTE FUNCTION validate_owner_transfer();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX one_owner_per_workspace IS 'Ensures exactly one owner per workspace. Prevents privilege escalation.';
COMMENT ON FUNCTION validate_owner_transfer IS 'Prevents removing the last owner without transferring ownership.';
