-- ============================================
-- Add workspace_id to leads_ohio table
-- ============================================

-- Add workspace_id column with default value
DO $$ 
DECLARE
  default_uuid TEXT := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='leads_ohio' AND column_name='workspace_id'
  ) THEN
    -- Add column with TEXT type to match workspaces.id
    ALTER TABLE leads_ohio 
    ADD COLUMN workspace_id TEXT DEFAULT default_uuid;
    
    -- Add foreign key constraint
    ALTER TABLE leads_ohio
    ADD CONSTRAINT fk_leads_ohio_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
    
    -- Create index for workspace filtering
    CREATE INDEX idx_leads_ohio_workspace_id ON leads_ohio(workspace_id);
    
    RAISE NOTICE 'Added workspace_id column to leads_ohio table';
  ELSE
    RAISE NOTICE 'workspace_id column already exists in leads_ohio table';
  END IF;
END $$;

-- ============================================
-- Enable RLS on leads_ohio
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE leads_ohio ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS leads_ohio_workspace_isolation ON leads_ohio;

-- Create RLS policy for workspace isolation
CREATE POLICY leads_ohio_workspace_isolation ON leads_ohio
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM user_workspaces 
      WHERE user_id = public.clerk_user_id()
    )
    OR 
    public.clerk_user_id() IN (
      SELECT unnest(string_to_array('user_36QtXCPqQu6k0CXcYM0Sn2OQsgT', ','))
    )
  );

-- ============================================
-- Verification Query
-- ============================================

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='leads_ohio' AND column_name='workspace_id'
  ) THEN
    RAISE NOTICE '✓ workspace_id column exists in leads_ohio';
  ELSE
    RAISE WARNING '✗ workspace_id column missing from leads_ohio';
  END IF;
END $$;

