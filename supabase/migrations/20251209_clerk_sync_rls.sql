-- ============================================
-- Phase 21: Clerk-Supabase Synchronization
-- Multi-Tenant Security with JWT-based RLS
-- ============================================

-- ============================================
-- 1. CREATE PUBLIC USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,                    -- Clerk user ID (e.g., user_xxx)
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read all user records (for team member lists)
CREATE POLICY users_read_all ON public.users
  FOR SELECT USING (true);

-- Only service role can write (via webhook)
CREATE POLICY users_service_write ON public.users
  FOR ALL USING (false);

-- ============================================
-- 2. CREATE HELPER FUNCTION FOR JWT USER ID
-- ============================================
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('app.user_id', true)  -- Fallback for service role
  );
$$ LANGUAGE sql STABLE;

-- ============================================
-- 3. DROP OLD RLS POLICIES
-- ============================================

-- Drop old policies that used current_setting('app.workspace_id')
DROP POLICY IF EXISTS contacts_workspace_isolation ON contacts;
DROP POLICY IF EXISTS email_events_workspace_isolation ON email_events;
DROP POLICY IF EXISTS llm_usage_workspace_isolation ON llm_usage;
DROP POLICY IF EXISTS daily_stats_workspace_isolation ON daily_stats;

-- ============================================
-- 4. CREATE NEW JWT-BASED RLS POLICIES
-- ============================================

-- Contacts: User can only access contacts in their workspaces
CREATE POLICY contacts_user_workspace_access ON contacts
  FOR ALL USING (
    workspace_id IN (
      SELECT uw.workspace_id 
      FROM user_workspaces uw 
      WHERE uw.user_id = public.clerk_user_id()
    )
  );

-- Email Events: User can only access events in their workspaces
CREATE POLICY email_events_user_workspace_access ON email_events
  FOR ALL USING (
    workspace_id IN (
      SELECT uw.workspace_id 
      FROM user_workspaces uw 
      WHERE uw.user_id = public.clerk_user_id()
    )
  );

-- LLM Usage: User can only access LLM usage in their workspaces
CREATE POLICY llm_usage_user_workspace_access ON llm_usage
  FOR ALL USING (
    workspace_id IN (
      SELECT uw.workspace_id 
      FROM user_workspaces uw 
      WHERE uw.user_id = public.clerk_user_id()
    )
  );

-- Daily Stats: User can only access stats in their workspaces
CREATE POLICY daily_stats_user_workspace_access ON daily_stats
  FOR ALL USING (
    workspace_id IN (
      SELECT uw.workspace_id 
      FROM user_workspaces uw 
      WHERE uw.user_id = public.clerk_user_id()
    )
  );

-- ============================================
-- 5. FIX WORKSPACE_INVITES TYPE MISMATCH
-- ============================================

-- Drop and recreate with correct TEXT type to match workspaces.id
DROP TABLE IF EXISTS workspace_invites CASCADE;

CREATE TABLE workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  uses_remaining INTEGER DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspace_invites_code ON workspace_invites(code);
CREATE INDEX idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_created_by ON workspace_invites(created_by);

-- Enable RLS on workspace_invites
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Only workspace admins can manage invites
CREATE POLICY workspace_invites_manage ON workspace_invites
  FOR ALL USING (
    workspace_id IN (
      SELECT uw.workspace_id 
      FROM user_workspaces uw 
      WHERE uw.user_id = public.clerk_user_id()
        AND uw.role IN ('owner', 'admin')
    )
  );

-- Anyone can read invites (needed for join flow)
CREATE POLICY workspace_invites_read_all ON workspace_invites
  FOR SELECT USING (true);

-- ============================================
-- 6. ADD PERFORMANCE INDEXES
-- ============================================

-- Index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id_lookup 
  ON user_workspaces(user_id, workspace_id);

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

GRANT ALL ON workspace_invites TO authenticated;
GRANT ALL ON workspace_invites TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.users IS 'Users synced from Clerk via webhook';
COMMENT ON FUNCTION auth.clerk_user_id() IS 'Extract Clerk user ID from JWT claims for RLS';
COMMENT ON TABLE workspace_invites IS 'Invite codes for joining workspaces (fixed TEXT type)';

