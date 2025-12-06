# 🏢 Workspace Multi-Tenant Setup Guide

## Overview

This dashboard now supports **multi-tenant workspaces**, allowing:
- ✅ Multiple users accessing the same dashboard
- ✅ Data isolation per workspace
- ✅ Role-based access control (Owner, Admin, Member, Viewer)
- ✅ Super admin access (can see all workspaces)

---

## 📋 Setup Steps

### **Step 1: Run the Migration**

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20251206_create_workspace_tables.sql`
3. Paste and execute the SQL

This will create:
- `workspaces` table
- `user_workspaces` table (maps users to workspaces)
- Default workspace called "Ohio Campaign" with ID `'default'`
- Add `workspace_id` columns to `email_events` and `llm_usage` tables

---

### **Step 2: Verify Default Workspace**

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM workspaces;
```

You should see:
```
id       | name           | slug           | plan | settings
---------|----------------|----------------|------|----------
default  | Ohio Campaign  | ohio-campaign  | free | {...}
```

---

### **Step 3: Add Your Super Admin Account**

Your Clerk user ID is already configured as super admin:
```typescript
// In lib/workspace-access.ts
const SUPER_ADMIN_IDS: string[] = [
  'user_36QtXCPqQu6k0CXcYM0Sn2OQsgT', // Your account
];
```

**Super admins can see ALL workspaces automatically** - no database entry needed!

---

### **Step 4: Test Auto-Assignment**

When a new user signs up with Clerk:
1. They log in
2. Frontend calls `/api/workspaces`
3. If they have NO workspaces, API **automatically** adds them to `'default'` workspace as `'owner'`
4. They can now see the dashboard data

**Code that handles this:**
```typescript:app/api/workspaces/route.ts
// Lines 98-123
if (workspaces.length === 0) {
  await addUserToWorkspace(DEFAULT_WORKSPACE_ID, effectiveUserId, 'owner');
  // ... returns default workspace
}
```

---

## 🧪 Testing the Setup

### **Test 1: Check Your Own Access**

1. Sign in to the dashboard
2. Open browser DevTools → Network tab
3. Look for `/api/workspaces` request
4. Response should show:
```json
{
  "workspaces": [
    {
      "id": "default",
      "name": "Ohio Campaign",
      "slug": "ohio-campaign",
      "plan": "free",
      "role": "owner"
    }
  ],
  "current": { ... },
  "isSuperAdmin": true
}
```

### **Test 2: Invite a New User**

Run this in Supabase SQL Editor to manually add a user:

```sql
-- Replace 'user_CLERK_ID' with actual Clerk user ID
INSERT INTO user_workspaces (user_id, workspace_id, role)
VALUES ('user_CLERK_ID', 'default', 'member')
ON CONFLICT (user_id, workspace_id) DO NOTHING;
```

### **Test 3: Verify Auto-Assignment**

1. Create a new Clerk account (different email)
2. Sign in
3. Check Supabase:
```sql
SELECT * FROM user_workspaces WHERE workspace_id = 'default';
```

You should see the new user automatically added!

---

## 👥 User Roles

| Role | Read Data | Write Data | Manage Settings | Delete Workspace |
|------|-----------|------------|-----------------|------------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ❌ |
| **Member** | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ |

---

## 🔐 Data Isolation

All data tables now have `workspace_id`:
- `email_events` - Email tracking data
- `llm_usage` - LLM cost data
- `daily_stats` - Aggregated metrics
- `contacts` - Contact information
- `campaigns` - Campaign data

**Important:** When you call API endpoints, make sure to pass `workspace_id` in query params:
```
GET /api/metrics/summary?workspace_id=default&start=2024-01-01&end=2024-12-31
```

---

## 🚀 Creating Additional Workspaces

### **Option 1: Via SQL**

```sql
-- Create new workspace
INSERT INTO workspaces (id, name, slug, plan, settings)
VALUES (
  'ws_123456',
  'California Campaign',
  'california-campaign',
  'pro',
  '{}'::jsonb
);

-- Add user to workspace
INSERT INTO user_workspaces (user_id, workspace_id, role)
VALUES ('user_CLERK_ID', 'ws_123456', 'owner');
```

### **Option 2: Via API** (Coming soon)

```typescript
const response = await fetch('/api/workspaces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'California Campaign',
    slug: 'california-campaign'
  })
});
```

---

## 🐛 Troubleshooting

### **Issue: Users see empty dashboard**

**Causes:**
1. Migration not run
2. User not assigned to any workspace
3. `DEFAULT_WORKSPACE_ID` doesn't exist in `workspaces` table

**Fix:**
```sql
-- Check if default workspace exists
SELECT * FROM workspaces WHERE id = 'default';

-- Check if user is assigned
SELECT * FROM user_workspaces WHERE user_id = 'user_YOUR_ID';

-- Manually assign user
INSERT INTO user_workspaces (user_id, workspace_id, role)
VALUES ('user_YOUR_ID', 'default', 'owner')
ON CONFLICT DO NOTHING;
```

### **Issue: Super admin can't see data**

**Causes:**
- User ID not in `SUPER_ADMIN_IDS` array
- Typo in user ID

**Fix:**
1. Get your Clerk user ID from Clerk Dashboard → Users
2. Update `lib/workspace-access.ts`:
```typescript
const SUPER_ADMIN_IDS: string[] = [
  'user_YOUR_ACTUAL_ID', // Add your ID here
];
```

### **Issue: RLS blocking access**

**Temporary Fix (Development Only):**
```sql
-- Disable RLS temporarily for debugging
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces DISABLE ROW LEVEL SECURITY;
```

**⚠️ Re-enable for production!**

---

## 📊 Monitoring Workspace Usage

```sql
-- See all workspaces and member counts
SELECT 
  w.id,
  w.name,
  COUNT(uw.user_id) as member_count,
  w.plan
FROM workspaces w
LEFT JOIN user_workspaces uw ON uw.workspace_id = w.id
GROUP BY w.id, w.name, w.plan
ORDER BY member_count DESC;

-- See specific workspace members
SELECT 
  uw.user_id,
  uw.role,
  uw.created_at
FROM user_workspaces uw
WHERE uw.workspace_id = 'default'
ORDER BY uw.created_at;

-- See data counts per workspace
SELECT 
  workspace_id,
  COUNT(*) as event_count
FROM email_events
GROUP BY workspace_id;
```

---

## 🔄 Migrating Existing Data

If you have existing data in `email_events` and `llm_usage` without `workspace_id`:

```sql
-- Update all existing data to default workspace
UPDATE email_events 
SET workspace_id = 'default' 
WHERE workspace_id IS NULL;

UPDATE llm_usage 
SET workspace_id = 'default' 
WHERE workspace_id IS NULL;
```

---

## 📅 Next Steps

1. ✅ Run migration
2. ✅ Test your super admin access
3. ✅ Verify auto-assignment works
4. ⬜ Add other team members
5. ⬜ Create additional workspaces (if needed)
6. ⬜ Update n8n workflows to send `workspace_id` (optional)

---

*Last updated: December 6, 2025*

