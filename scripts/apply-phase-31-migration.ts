#!/usr/bin/env tsx
/**
 * Apply Phase 31 Migration
 * Adds n8n integration columns to campaigns table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 Applying Phase 31 Migration: n8n Integration\n');

  try {
    // Step 1: Add columns
    console.log('📝 Step 1: Adding n8n integration columns...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT,
        ADD COLUMN IF NOT EXISTS n8n_status TEXT DEFAULT 'unknown' CHECK (
          n8n_status IN ('active', 'inactive', 'unknown', 'error')
        ),
        ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      throw alterError;
    }
    console.log('✅ Columns added\n');

    // Step 2: Create indexes
    console.log('📝 Step 2: Creating indexes...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_campaigns_n8n_workflow ON campaigns(n8n_workflow_id);
        CREATE INDEX IF NOT EXISTS idx_campaigns_status_ws ON campaigns(workspace_id, status);
      `
    });

    if (indexError) {
      throw indexError;
    }
    console.log('✅ Indexes created\n');

    // Step 3: Add comments
    console.log('📝 Step 3: Adding column comments...');
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN campaigns.n8n_workflow_id IS 'Links this campaign to an n8n workflow by ID';
        COMMENT ON COLUMN campaigns.n8n_status IS 'Current status of the n8n workflow: active, inactive, unknown, error';
        COMMENT ON COLUMN campaigns.last_sync_at IS 'Timestamp of last synchronization with n8n';
        COMMENT ON COLUMN campaigns.version IS 'Version number for optimistic concurrency control';
      `
    });

    if (commentError) {
      throw commentError;
    }
    console.log('✅ Comments added\n');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️  Fallback: Please run the SQL manually in Supabase Dashboard');
    console.log('File: supabase/migrations/20251218_add_n8n_integration.sql');
    process.exit(1);
  }
}

applyMigration();
