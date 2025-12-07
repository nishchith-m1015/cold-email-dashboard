-- Add workspace invite codes table for team joining
-- Run this in your Supabase SQL Editor

-- Create workspace_invites table
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by VARCHAR(255) NOT NULL, -- Clerk user ID
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  uses_remaining INTEGER DEFAULT NULL, -- NULL = unlimited
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL = never expires
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_workspace_invites_code ON workspace_invites(code);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);

-- Add RLS policies
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := 'TEAM-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create a default invite code for the default workspace
INSERT INTO workspace_invites (workspace_id, code, created_by, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'TEAM-OHIO24',
  'system',
  'member'
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_invites 
  WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
);

-- Grant permissions
GRANT ALL ON workspace_invites TO authenticated;
GRANT ALL ON workspace_invites TO service_role;

COMMENT ON TABLE workspace_invites IS 'Invite codes for joining workspaces';

