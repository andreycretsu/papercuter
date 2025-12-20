import { getSupabaseAdmin } from "@/server/supabase-admin";

export type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk';

export const PAPERCUT_MODULES: PapercutModule[] = ['CoreHR', 'Recruit', 'Perform', 'Pulse', 'Time', 'Desk'];

export type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
  userEmail?: string | null;
  module?: PapercutModule | null;
};

type DbRow = {
  id: string;
  name: string;
  description_html: string;
  screenshot_url: string | null;
  created_at: string;
  user_email: string | null;
  module: string | null;
};

export async function listPapercutsSupabase(): Promise<Papercut[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at,user_email,module")
    .order("created_at", { ascending: false });

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
  }));
}

export async function getPapercutById(id: string): Promise<Papercut | null> {
  const supabase = getSupabaseAdmin();
  const { data, error} = await supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at,user_email,module")
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
    .select("id,name,description_html,screenshot_url,created_at,user_email,module")
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
  };
}


