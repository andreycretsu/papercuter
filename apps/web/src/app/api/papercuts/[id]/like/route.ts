import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: papercutId } = await context.params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('papercut_likes')
      .select('id')
      .eq('papercut_id', papercutId)
      .eq('user_id', userData.id)
      .single();

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 });
    }

    // Create like
    const { error: likeError } = await supabase
      .from('papercut_likes')
      .insert({
        papercut_id: papercutId,
        user_id: userData.id,
      });

    if (likeError) {
      console.error('Error creating like:', likeError);
      return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
    }

    // Get updated like count
    const { count } = await supabase
      .from('papercut_likes')
      .select('*', { count: 'exact', head: true })
      .eq('papercut_id', papercutId);

    return NextResponse.json({ success: true, likeCount: count || 0 });
  } catch (error) {
    console.error('Error in like endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: papercutId } = await context.params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete like
    const { error: deleteError } = await supabase
      .from('papercut_likes')
      .delete()
      .eq('papercut_id', papercutId)
      .eq('user_id', userData.id);

    if (deleteError) {
      console.error('Error deleting like:', deleteError);
      return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 });
    }

    // Get updated like count
    const { count } = await supabase
      .from('papercut_likes')
      .select('*', { count: 'exact', head: true })
      .eq('papercut_id', papercutId);

    return NextResponse.json({ success: true, likeCount: count || 0 });
  } catch (error) {
    console.error('Error in unlike endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
