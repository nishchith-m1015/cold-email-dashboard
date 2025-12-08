-- Fix broken webhook queue trigger
-- Run this in Supabase SQL Editor

-- Step 1: Drop the broken trigger and function
DROP TRIGGER IF EXISTS trg_process_webhook_queue ON webhook_queue;
DROP FUNCTION IF EXISTS process_webhook_queue();

-- Step 2: Recreate from the fixed migration file
-- Copy the CREATE FUNCTION and CREATE TRIGGER statements from:
-- supabase/migrations/20251207_webhook_queue_idempotency.sql
-- Starting from line ~80 to line ~270

-- Or run this command in your terminal to apply the full migration:
-- supabase db reset --linked
