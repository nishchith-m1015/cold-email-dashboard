-- ============================================
-- WORKSPACE MULTI-TENANT SYSTEM
-- ============================================
-- Creates tables for workspace-based multi-tenancy:
-- 1. workspaces - Main workspace table
-- 2. user_workspaces - Maps users to workspaces with roles
-- 3. Adds workspace_id to existing tables
-- ============================================

-- Create workspaces table (using UUID for compatibility)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_workspaces junction table (many-to-many)
CREATE TABLE IF NOT EXISTS user_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Clerk user ID
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one role per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Index for fast user workspace lookups
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);

-- ============================================
-- INSERT DEFAULT WORKSPACE
-- ============================================
-- This workspace will be assigned to all users by default
-- Using a fixed UUID for the default workspace

DO $$
DECLARE
  default_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO workspaces (id, name, slug, plan, settings)
  VALUES (
    default_uuid,
    'Ohio Campaign',
    'ohio-campaign',
    'free',
    '{"description": "Default workspace for Ohio cold email campaign"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    updated_at = NOW();
END $$;

-- ============================================
-- ADD WORKSPACE_ID TO EXISTING TABLES
-- ============================================
-- Add workspace_id column to existing tables if not present

-- email_events
DO $$ 
DECLARE
  default_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='email_events' AND column_name='workspace_id'
  ) THEN
    ALTER TABLE email_events 
    ADD COLUMN workspace_id UUID DEFAULT default_uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Create index for workspace filtering
    CREATE INDEX idx_email_events_workspace_id ON email_events(workspace_id);
  END IF;
END $$;

-- llm_usage
DO $$ 
DECLARE
  default_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='llm_usage' AND column_name='workspace_id'
  ) THEN
    ALTER TABLE llm_usage 
    ADD COLUMN workspace_id UUID DEFAULT default_uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Create index for workspace filtering
    CREATE INDEX idx_llm_usage_workspace_id ON llm_usage(workspace_id);
  END IF;
END $$;

-- daily_stats (if exists)
DO $$ 
DECLARE
  default_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='daily_stats'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='daily_stats' AND column_name='workspace_id'
  ) THEN
    ALTER TABLE daily_stats 
    ADD COLUMN workspace_id UUID DEFAULT default_uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Create index for workspace filtering
    CREATE INDEX idx_daily_stats_workspace_id ON daily_stats(workspace_id);
  END IF;
END $$;

-- contacts (if exists)
DO $$ 
DECLARE
  default_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='contacts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='contacts' AND column_name='workspace_id'
  ) THEN
    ALTER TABLE contacts 
    ADD COLUMN workspace_id UUID DEFAULT default_uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Create index for workspace filtering
    CREATE INDEX idx_contacts_workspace_id ON contacts(workspace_id);
  END IF;
END $$;

-- campaigns (if exists)
DO $$ 
DECLARE
  default_uuid UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='campaigns'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='campaigns' AND column_name='workspace_id'
  ) THEN
    ALTER TABLE campaigns 
    ADD COLUMN workspace_id UUID DEFAULT default_uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Create index for workspace filtering
    CREATE INDEX idx_campaigns_workspace_id ON campaigns(workspace_id);
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS for workspace tables

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read workspaces they belong to
CREATE POLICY "Users can read their workspaces"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Policy: Users can read their workspace memberships
CREATE POLICY "Users can read their workspace memberships"
  ON user_workspaces FOR SELECT
  USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Policy: Workspace owners/admins can manage memberships
CREATE POLICY "Workspace owners can manage memberships"
  ON user_workspaces FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Get user's workspaces
CREATE OR REPLACE FUNCTION get_user_workspaces(p_user_id TEXT)
RETURNS TABLE (
  workspace_id UUID,
  workspace_name TEXT,
  workspace_slug TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.slug,
    uw.role
  FROM workspaces w
  JOIN user_workspaces uw ON uw.workspace_id = w.id
  WHERE uw.user_id = p_user_id
  ORDER BY w.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has access to workspace
CREATE OR REPLACE FUNCTION user_has_workspace_access(
  p_user_id TEXT,
  p_workspace_id UUID,
  required_role TEXT DEFAULT 'viewer'
) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy TEXT[] := ARRAY['viewer', 'member', 'admin', 'owner'];
  user_level INT;
  required_level INT;
BEGIN
  -- Get user's role in workspace
  SELECT role INTO user_role
  FROM user_workspaces
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id;
  
  -- If no role found, no access
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check role hierarchy
  user_level := array_position(role_hierarchy, user_role);
  required_level := array_position(role_hierarchy, required_role);
  
  RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE workspaces IS 'Multi-tenant workspaces for organizing campaigns and data';
COMMENT ON TABLE user_workspaces IS 'Junction table mapping users to workspaces with roles';
COMMENT ON COLUMN workspaces.plan IS 'Subscription tier: free, starter, pro, enterprise';
COMMENT ON COLUMN user_workspaces.role IS 'User role in workspace: owner, admin, member, viewer';

