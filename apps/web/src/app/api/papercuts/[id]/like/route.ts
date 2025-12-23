import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getSupabaseAdmin } from '@/server/supabase-admin';

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
    const supabase = getSupabaseAdmin();

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add a new like (unlimited likes allowed)
    const { error: likeError } = await supabase
      .from('papercut_likes')
      .insert({
        papercut_id: papercutId,
        user_id: userData.id,
      });

    if (likeError) {
      console.error('Error creating like:', likeError);
      console.error('Error details:', {
        message: likeError.message,
        code: likeError.code,
        details: likeError.details,
        hint: likeError.hint,
      });
      return NextResponse.json({
        error: 'Failed to like',
        details: likeError.message,
        code: likeError.code
      }, { status: 500 });
    }

    // Get updated like counts
    const { count: totalCount } = await supabase
      .from('papercut_likes')
      .select('*', { count: 'exact', head: true })
      .eq('papercut_id', papercutId);

    const { count: userCount } = await supabase
      .from('papercut_likes')
      .select('*', { count: 'exact', head: true })
      .eq('papercut_id', papercutId)
      .eq('user_id', userData.id);

    return NextResponse.json({
      success: true,
      likeCount: totalCount || 0,
      userLikeCount: userCount || 0
    });
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
    const supabase = getSupabaseAdmin();

    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get one like to delete
    const { data: likeToDelete } = await supabase
      .from('papercut_likes')
      .select('id')
      .eq('papercut_id', papercutId)
      .eq('user_id', userData.id)
      .limit(1)
      .single();

    if (!likeToDelete) {
      return NextResponse.json({ error: 'No likes to remove' }, { status: 400 });
    }

    // Delete one like
    const { error: deleteError } = await supabase
      .from('papercut_likes')
      .delete()
      .eq('id', likeToDelete.id);

    if (deleteError) {
      console.error('Error deleting like:', deleteError);
      return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 });
    }

    // Get updated like counts
    const { count: totalCount } = await supabase
      .from('papercut_likes')
      .select('*', { count: 'exact', head: true })
      .eq('papercut_id', papercutId);

    const { count: userCount } = await supabase
      .from('papercut_likes')
      .select('*', { count: 'exact', head: true })
      .eq('papercut_id', papercutId)
      .eq('user_id', userData.id);

    return NextResponse.json({
      success: true,
      likeCount: totalCount || 0,
      userLikeCount: userCount || 0
    });
  } catch (error) {
    console.error('Error in unlike endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
