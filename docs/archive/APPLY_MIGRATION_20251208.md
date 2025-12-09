# Apply Core Features Migration

## Migration File
`supabase/migrations/20251208_core_features.sql`

## Steps to Apply

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project (`cold-email-dashboard-starter`)
3. Navigate to **SQL Editor** in the left sidebar

### 2. Run the Migration
1. Click **New Query**
2. Copy the entire contents of `supabase/migrations/20251208_core_features.sql`
3. Paste into the SQL editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

### 3. Verify Tables Created
Run this query to confirm:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('research_logs', 'notifications');
```

Expected output: 2 rows (both tables should appear)

### 4. Verify Triggers Created
Run this query:
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_notify_reply', 'trigger_notify_opt_out');
```

Expected output: 2 rows (both triggers should appear)

### 5. Test Notification Trigger
Insert a test reply event to verify the trigger works:
```sql
-- Insert a test reply event
INSERT INTO email_events (workspace_id, contact_email, campaign_name, event_type, email_number)
VALUES ('default', 'test@example.com', 'Test Campaign', 'replied', 1);

-- Check if notification was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;

-- Clean up test data
DELETE FROM email_events WHERE contact_email = 'test@example.com';
DELETE FROM notifications WHERE related_campaign = 'Test Campaign';
```

## What This Migration Adds

### New Tables
- **`research_logs`**: Stores Google CSE research quality data for auditing
- **`notifications`**: Stores user notifications (replies, opt-outs, alerts)

### New Triggers
- **`notify_on_reply()`**: Auto-creates notification when someone replies
- **`notify_on_opt_out()`**: Auto-creates notification when someone opts out

### Indexes
- 7 new indexes for performance optimization
- RLS policies for workspace isolation

## Troubleshooting

**Error: "relation 'workspaces' does not exist"**
- Run the workspace migration first: `supabase/migrations/20251206_create_workspace_tables.sql`

**Error: "relation 'email_events' does not exist"**
- Your schema is missing core tables. Run all migrations in order.

**Trigger not firing?**
- Check that the event_type exactly matches 'replied' or 'opt_out' (case-sensitive)
- Verify workspace_id is set correctly on the email_event

