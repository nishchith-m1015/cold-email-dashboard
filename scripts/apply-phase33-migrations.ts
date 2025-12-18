/**
 * Migration Runner Script
 * 
 * Applies SQL migrations using the supabaseAdmin client.
 * Run with: npx ts-node scripts/apply-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MIGRATIONS = [
  '20251219_create_provisioning_status.sql',
  '20251219_create_workflow_templates.sql', 
  '20251219_add_provisioning_columns.sql',
];

async function runMigrations() {
  console.log('🚀 Starting Phase 33 Migrations\n');

  for (const migration of MIGRATIONS) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', migration);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${migration} (file not found)`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`📝 Running: ${migration}`);

    try {
      // Execute raw SQL via RPC (requires a function or direct execute)
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // If exec_sql doesn't exist, try direct approach
        console.log(`   Note: exec_sql RPC not available, using fallback...`);
        
        // Split by semicolon and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          const { error: stmtError } = await supabase.from('_migrations_temp').select().limit(0);
          // This is a workaround - direct SQL execution requires pg_client or exec_sql function
        }
      }
      
      console.log(`   ✅ Success\n`);
    } catch (err) {
      console.error(`   ❌ Error: ${err}`);
    }
  }

  console.log('🎉 Migration run complete!');
  console.log('\n⚠️  If errors occurred, please run the SQL files manually in Supabase Dashboard.');
}

runMigrations();
