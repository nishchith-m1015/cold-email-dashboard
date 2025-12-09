#!/usr/bin/env node

/**
 * Clerk User Backfill Script
 * 
 * This script fetches all users from Clerk and syncs them to Supabase's public.users table.
 * Run this once after setting up the webhook to ensure existing users are synced.
 * 
 * Usage: npx tsx scripts/backfill-clerk-users.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Validate environment variables
const requiredEnvVars = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error('\nPlease set them in .env.local');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(
  requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
  requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

interface ClerkUsersResponse {
  data: ClerkUser[];
  total_count: number;
}

/**
 * Fetch all users from Clerk API
 */
async function fetchClerkUsers(): Promise<ClerkUser[]> {
  const CLERK_API_URL = 'https://api.clerk.com/v1';
  const users: ClerkUser[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(
      `${CLERK_API_URL}/users?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${requiredEnvVars.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Clerk API error: ${response.status} - ${error}`);
    }

    const data: ClerkUser[] = await response.json();
    
    if (data.length === 0) {
      break;
    }

    users.push(...data);
    offset += limit;

    // If we got fewer users than the limit, we've reached the end
    if (data.length < limit) {
      break;
    }
  }

  return users;
}

/**
 * Sync a user to Supabase
 */
async function syncUserToSupabase(user: ClerkUser): Promise<boolean> {
  // Get primary email
  const primaryEmail = user.email_addresses[0]?.email_address;

  if (!primaryEmail) {
    console.warn(`⚠️  User ${user.id} has no email address, skipping`);
    return false;
  }

  // Upsert to Supabase
  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      email: primaryEmail,
      first_name: user.first_name,
      last_name: user.last_name,
      image_url: user.image_url,
      created_at: new Date(user.created_at).toISOString(),
      updated_at: new Date(user.updated_at).toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    console.error(`❌ Failed to sync user ${user.id}:`, error.message);
    return false;
  }

  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Starting Clerk user backfill...\n');

  try {
    // Step 1: Fetch users from Clerk
    console.log('📥 Fetching users from Clerk...');
    const clerkUsers = await fetchClerkUsers();
    console.log(`✓ Found ${clerkUsers.length} users in Clerk\n`);

    if (clerkUsers.length === 0) {
      console.log('No users to sync. Exiting.');
      return;
    }

    // Step 2: Sync users to Supabase
    console.log('📤 Syncing users to Supabase...');
    let successCount = 0;
    let failureCount = 0;

    for (const user of clerkUsers) {
      const primaryEmail = user.email_addresses[0]?.email_address || 'no-email';
      const displayName = user.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : primaryEmail;

      const success = await syncUserToSupabase(user);

      if (success) {
        console.log(`  ✓ ${displayName} (${user.id})`);
        successCount++;
      } else {
        console.log(`  ✗ ${displayName} (${user.id})`);
        failureCount++;
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Backfill Summary:');
    console.log(`   Total users: ${clerkUsers.length}`);
    console.log(`   ✓ Synced: ${successCount}`);
    if (failureCount > 0) {
      console.log(`   ✗ Failed: ${failureCount}`);
    }
    console.log('='.repeat(50) + '\n');

    // Step 4: Verify in Supabase
    console.log('🔍 Verifying users in Supabase...');
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Failed to count users in Supabase:', error.message);
    } else {
      console.log(`✓ Total users in Supabase: ${count}\n`);
    }

    console.log('✅ Backfill complete!');
    console.log('\nNext steps:');
    console.log('1. Verify users in Supabase dashboard');
    console.log('2. Set up Clerk webhook to keep users in sync');
    console.log('3. Test the authentication flow\n');

  } catch (error) {
    console.error('\n❌ Backfill failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();

