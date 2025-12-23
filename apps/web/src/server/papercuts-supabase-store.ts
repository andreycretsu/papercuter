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
  isLikedByCurrentUser?: boolean;
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

  // Get like counts and user's likes
  const papercutIds = rows.map(r => r.id);
  let likeCounts: Record<string, number> = {};
  let userLikes: Set<string> = new Set();

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

    // Get current user's likes if email provided
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
            userLikes.add(like.papercut_id);
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
    isLikedByCurrentUser: userLikes.has(r.id),
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

  // Check if current user liked this papercut
  let isLikedByCurrentUser = false;
  if (currentUserEmail) {
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', currentUserEmail)
      .single();

    if (userData) {
      const { data: userLike } = await supabase
        .from('papercut_likes')
        .select('id')
        .eq('papercut_id', id)
        .eq('user_id', userData.id)
        .single();

      isLikedByCurrentUser = !!userLike;
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
    isLikedByCurrentUser,
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

export async function updatePapercutStatus(id: string, status: PapercutStatus): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("papercuts")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[updatePapercutStatus] Database error:", error);
    throw error;
  }
}


