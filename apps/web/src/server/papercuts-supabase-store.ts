import { getSupabaseAdmin } from "@/server/supabase-admin";

export type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk';
export type PapercutStatus = 'open' | 'resolved';

export const PAPERCUT_MODULES: PapercutModule[] = ['CoreHR', 'Recruit', 'Perform', 'Pulse', 'Time', 'Desk'];
export const PAPERCUT_STATUSES: PapercutStatus[] = ['open', 'resolved'];

export type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
  userEmail?: string | null;
  module?: PapercutModule | null;
  status: PapercutStatus;
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
};

export async function listPapercutsSupabase(statusFilter?: PapercutStatus): Promise<Papercut[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at,user_email,module,status")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) throw error;
  const rows = (data ?? []) as DbRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    descriptionHtml: r.description_html ?? "",
    screenshotUrl: r.screenshot_url,
    createdAt: r.created_at,
    userEmail: r.user_email,
    module: r.module as PapercutModule | null,
    status: (r.status || 'open') as PapercutStatus,
  }));
}

export async function getPapercutById(id: string): Promise<Papercut | null> {
  const supabase = getSupabaseAdmin();
  const { data, error} = await supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at,user_email,module,status")
    .eq("id", id)
    .single();

  if (error || !data) return null;
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
  };
}

export async function createPapercutSupabase(input: {
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  userEmail?: string | null;
  module?: PapercutModule | null;
}): Promise<Papercut> {
  const supabase = getSupabaseAdmin();
  const name = input.name.trim() || "Untitled";
  const insert = {
    name,
    description_html: input.descriptionHtml ?? "",
    screenshot_url: input.screenshotUrl ?? null,
    user_email: input.userEmail ?? null,
    module: input.module ?? null,
  };

  console.log("[createPapercutSupabase] Inserting into database:", insert);

  const { data, error } = await supabase
    .from("papercuts")
    .insert(insert)
    .select("id,name,description_html,screenshot_url,created_at,user_email,module,status")
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


