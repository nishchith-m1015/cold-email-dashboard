import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * POST /api/user/sync
 * 
 * Self-Healing User Sync Endpoint
 * Checks if the current user exists in the database.
 * If not, fetches their data from Clerk and inserts it.
 * 
 * This acts as a safety net when webhooks fail.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user exists in database
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    // User already exists - no sync needed
    if (existingUser) {
      return NextResponse.json({ synced: false, message: 'User already exists' });
    }

    // User is missing - fetch from Clerk and insert
    /* eslint-disable-next-line no-console */
    console.log(`[UserSync] User ${userId} missing from database. Syncing...`);

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      );
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'User has no email address' },
        { status: 400 }
      );
    }

    // Insert user into database
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: primaryEmail.emailAddress,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        image_url: clerkUser.imageUrl,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[UserSync] Failed to insert user:', insertError);
      return NextResponse.json(
        { error: 'Failed to sync user to database' },
        { status: 500 }
      );
    }

    /* eslint-disable-next-line no-console */
    console.log(`[UserSync] ✓ User ${userId} synced successfully (${primaryEmail.emailAddress})`);

    return NextResponse.json({
      synced: true,
      message: 'User synced successfully',
      user: {
        id: userId,
        email: primaryEmail.emailAddress,
      },
    });

  } catch (error) {
    console.error('[UserSync] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
