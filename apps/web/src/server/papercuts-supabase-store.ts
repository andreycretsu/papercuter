import { getSupabaseAdmin } from "@/server/supabase-admin";

export type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk' | 'Interface';
export type PapercutStatus = 'open' | 'resolved';
export type PapercutType = 'UXUI' | 'Feature Idea';

export const PAPERCUT_MODULES: PapercutModule[] = ['CoreHR', 'Recruit', 'Perform', 'Pulse', 'Time', 'Desk', 'Interface'];
export const PAPERCUT_STATUSES: PapercutStatus[] = ['open', 'resolved'];
export const PAPERCUT_TYPES: PapercutType[] = ['UXUI', 'Feature Idea'];

export type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
  userEmail?: string | null;
  module?: PapercutModule | null;
  status: PapercutStatus;
  type: PapercutType;
  likeCount?: number;
  userLikeCount?: number;
};

type DbRow = {
  id: string;
  name: string;
  description_html: string;
  screenshot_url: string | null;
  created_at: string;
  user_email: string | null;
  module: string | null;
  status: string;
  type: string;
};

export async function listPapercutsSupabase(statusFilter?: PapercutStatus, currentUserEmail?: string): Promise<Papercut[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at,user_email,module,status,type")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;
  const rows = (data ?? []) as DbRow[];

  // Get like counts and user's like counts
  const papercutIds = rows.map(r => r.id);
  let likeCounts: Record<string, number> = {};
  let userLikeCounts: Record<string, number> = {};

  if (papercutIds.length > 0) {
    // Get like counts for all papercuts
    const { data: likesData } = await supabase
      .from('papercut_likes')
      .select('papercut_id')
      .in('papercut_id', papercutIds);

    if (likesData) {
      likesData.forEach((like: any) => {
        likeCounts[like.papercut_id] = (likeCounts[like.papercut_id] || 0) + 1;
      });
    }

    // Get current user's like counts if email provided
    if (currentUserEmail) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', currentUserEmail)
        .single();

      if (userData) {
        const { data: userLikesData } = await supabase
          .from('papercut_likes')
          .select('papercut_id')
          .eq('user_id', userData.id)
          .in('papercut_id', papercutIds);

        if (userLikesData) {
          userLikesData.forEach((like: any) => {
            userLikeCounts[like.papercut_id] = (userLikeCounts[like.papercut_id] || 0) + 1;
          });
        }
      }
    }
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    descriptionHtml: r.description_html ?? "",
    screenshotUrl: r.screenshot_url,
    createdAt: r.created_at,
    userEmail: r.user_email,
    module: r.module as PapercutModule | null,
    status: (r.status || 'open') as PapercutStatus,
    type: (r.type || 'UXUI') as PapercutType,
    likeCount: likeCounts[r.id] || 0,
    userLikeCount: userLikeCounts[r.id] || 0,
  }));
}

export async function getPapercutById(id: string, currentUserEmail?: string): Promise<Papercut | null> {
  const supabase = getSupabaseAdmin();
  const { data, error} = await supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at,user_email,module,status,type")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  const r = data as DbRow;

  // Get like count
  const { count: likeCount } = await supabase
    .from('papercut_likes')
    .select('*', { count: 'exact', head: true })
    .eq('papercut_id', id);

  // Get current user's like count
  let userLikeCount = 0;
  if (currentUserEmail) {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', currentUserEmail)
      .single();

    if (userData) {
      const { count } = await supabase
        .from('papercut_likes')
        .select('*', { count: 'exact', head: true })
        .eq('papercut_id', id)
        .eq('user_id', userData.id);

      userLikeCount = count || 0;
    }
  }

  return {
    id: r.id,
    name: r.name,
    descriptionHtml: r.description_html ?? "",
    screenshotUrl: r.screenshot_url,
    createdAt: r.created_at,
    userEmail: r.user_email,
    module: r.module as PapercutModule | null,
    status: (r.status || 'open') as PapercutStatus,
    type: (r.type || 'UXUI') as PapercutType,
    likeCount: likeCount || 0,
    userLikeCount,
  };
}

export async function createPapercutSupabase(input: {
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  userEmail?: string | null;
  module?: PapercutModule | null;
  type?: PapercutType;
}): Promise<Papercut> {
  const supabase = getSupabaseAdmin();
  const name = input.name.trim() || "Untitled";
  const insert = {
    name,
    description_html: input.descriptionHtml ?? "",
    screenshot_url: input.screenshotUrl ?? null,
    user_email: input.userEmail ?? null,
    module: input.module ?? null,
    type: input.type ?? 'UXUI',
  };

  console.log("[createPapercutSupabase] Inserting into database:", insert);

  const { data, error } = await supabase
    .from("papercuts")
    .insert(insert)
    .select("id,name,description_html,screenshot_url,created_at,user_email,module,status,type")
    .single();

  if (error) {
    console.error("[createPapercutSupabase] Database error:", error);
    throw error;
  }
  const r = data as DbRow;
  return {
    id: r.id,
    name: r.name,
    descriptionHtml: r.description_html ?? "",
    screenshotUrl: r.screenshot_url,
    createdAt: r.created_at,
    userEmail: r.user_email,
    module: r.module as PapercutModule | null,
    status: (r.status || 'open') as PapercutStatus,
    type: (r.type || 'UXUI') as PapercutType,
  };
}

export async function updatePapercutStatus(id: string, status: PapercutStatus, userEmail: string = "Unknown"): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Update the papercut status
  const { error } = await supabase
    .from("papercuts")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[updatePapercutStatus] Database error:", error);
    throw error;
  }

  // Log the activity
  const action = status === 'resolved' ? 'resolved' : 'reopened';
  const { error: activityError } = await supabase
    .from("papercut_activity")
    .insert({
      papercut_id: id,
      user_email: userEmail,
      action,
    });

  if (activityError) {
    console.error("[updatePapercutStatus] Failed to log activity:", activityError);
    // Don't throw - activity logging failure shouldn't fail the status update
  }
}

export type PapercutActivity = {
  id: string;
  papercutId: string;
  userEmail: string;
  action: 'created' | 'edited' | 'resolved' | 'reopened';
  createdAt: string;
};

export async function getPapercutActivity(papercutId: string): Promise<PapercutActivity[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("papercut_activity")
    .select("id, papercut_id, user_email, action, created_at")
    .eq("papercut_id", papercutId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPapercutActivity] Database error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    papercutId: row.papercut_id,
    userEmail: row.user_email,
    action: row.action,
    createdAt: row.created_at,
  }));
}


