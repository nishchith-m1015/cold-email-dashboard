import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { validateWorkspaceAccess } from '@/lib/api-workspace-guard';

export const dynamic = 'force-dynamic';

interface Notification {
  id: string;
  type: 'reply' | 'opt_out' | 'budget_alert' | 'campaign_complete' | 'system';
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
  related_campaign?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

/**
 * GET /api/notifications
 * Fetch notifications for the current user/workspace
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Build query
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by user_id (NULL means broadcast to all users in workspace)
    query = query.or(`user_id.eq.${userId},user_id.is.null`);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    const unreadCount = data?.filter(n => !n.read_at).length || 0;

    return NextResponse.json({
      notifications: data || [],
      unread_count: unreadCount,
    } as NotificationsResponse);

  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read or dismissed
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { notification_ids, action, workspace_id } = body;

    if (!action || !['read', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "read" or "dismiss"' },
        { status: 400 }
      );
    }

    const workspaceId = workspace_id || DEFAULT_WORKSPACE_ID;
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('notifications')
      .update(
        action === 'read'
          ? { read_at: now }
          : { dismissed_at: now }
      )
      .eq('workspace_id', workspaceId);

    // If notification_ids is 'all', mark all unread notifications for this user
    if (notification_ids === 'all') {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
      if (action === 'read') {
        query = query.is('read_at', null);
      } else {
        query = query.is('dismissed_at', null);
      }
    } else if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      query = query.in('id', notification_ids);
    } else {
      return NextResponse.json(
        { error: 'Invalid notification_ids. Must be an array or "all"' },
        { status: 400 }
      );
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('Error updating notifications:', error);
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
    });

  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notification id' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('workspace_id', workspaceId)
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Notifications DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

