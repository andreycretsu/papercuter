import { getSupabaseAdmin } from "@/server/supabase-admin";

export type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
};

type DbRow = {
  id: string;
  name: string;
  description_html: string;
  screenshot_url: string | null;
  created_at: string;
};

export async function listPapercutsSupabase(): Promise<Papercut[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as DbRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    descriptionHtml: r.description_html ?? "",
    screenshotUrl: r.screenshot_url,
    createdAt: r.created_at,
  }));
}

export async function getPapercutById(id: string): Promise<Papercut | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("papercuts")
    .select("id,name,description_html,screenshot_url,created_at")
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
  };
}

export async function createPapercutSupabase(input: {
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
}): Promise<Papercut> {
  const supabase = getSupabaseAdmin();
  const name = input.name.trim() || "Untitled";
  const insert = {
    name,
    description_html: input.descriptionHtml ?? "",
    screenshot_url: input.screenshotUrl ?? null,
  };

  const { data, error } = await supabase
    .from("papercuts")
    .insert(insert)
    .select("id,name,description_html,screenshot_url,created_at")
    .single();

  if (error) throw error;
  const r = data as DbRow;
  return {
    id: r.id,
    name: r.name,
    descriptionHtml: r.description_html ?? "",
    screenshotUrl: r.screenshot_url,
    createdAt: r.created_at,
  };
}


