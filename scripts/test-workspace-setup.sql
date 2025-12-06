-- ============================================
-- WORKSPACE SETUP TEST SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor after migration
-- to verify everything is working correctly
-- ============================================

-- Test 1: Check if workspaces table exists and has default workspace
SELECT 
  '✅ Test 1: Default Workspace Exists' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM workspaces WHERE id = 'default')
    THEN 'PASS - Default workspace found'
    ELSE 'FAIL - Default workspace not found'
  END as result;

-- Test 2: Check if user_workspaces table exists
SELECT 
  '✅ Test 2: User Workspaces Table' as test,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_workspaces')
    THEN 'PASS - Table exists'
    ELSE 'FAIL - Table not found'
  END as result;

-- Test 3: Check if email_events has workspace_id column
SELECT 
  '✅ Test 3: Email Events Workspace Column' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'email_events' AND column_name = 'workspace_id'
    )
    THEN 'PASS - Column exists'
    ELSE 'FAIL - Column not found'
  END as result;

-- Test 4: Check if llm_usage has workspace_id column
SELECT 
  '✅ Test 4: LLM Usage Workspace Column' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'llm_usage' AND column_name = 'workspace_id'
    )
    THEN 'PASS - Column exists'
    ELSE 'FAIL - Column not found'
  END as result;

-- Test 5: Show all workspaces
SELECT 
  '📋 Workspace List' as info,
  id,
  name,
  slug,
  plan,
  created_at
FROM workspaces
ORDER BY created_at;

-- Test 6: Show all user assignments
SELECT 
  '👥 User Assignments' as info,
  user_id,
  workspace_id,
  role,
  created_at
FROM user_workspaces
ORDER BY created_at DESC
LIMIT 10;

-- Test 7: Check existing data has workspace_id
SELECT 
  '📊 Data Migration Status' as info,
  'email_events' as table_name,
  COUNT(*) as total_rows,
  COUNT(workspace_id) as rows_with_workspace,
  COUNT(*) - COUNT(workspace_id) as rows_missing_workspace
FROM email_events

UNION ALL

SELECT 
  '📊 Data Migration Status' as info,
  'llm_usage' as table_name,
  COUNT(*) as total_rows,
  COUNT(workspace_id) as rows_with_workspace,
  COUNT(*) - COUNT(workspace_id) as rows_missing_workspace
FROM llm_usage;

-- Test 8: Test helper function
SELECT 
  '🔧 Helper Function Test' as info,
  user_has_workspace_access(
    'user_36QtXCPqQu6k0CXcYM0Sn2OQsgT',  -- Replace with your Clerk ID
    'default',
    'viewer'
  ) as has_access;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  '📝 SETUP SUMMARY' as section,
  (SELECT COUNT(*) FROM workspaces) as total_workspaces,
  (SELECT COUNT(*) FROM user_workspaces) as total_user_assignments,
  (SELECT COUNT(*) FROM email_events WHERE workspace_id = 'default') as default_workspace_events,
  (SELECT COUNT(*) FROM llm_usage WHERE workspace_id = 'default') as default_workspace_costs;

