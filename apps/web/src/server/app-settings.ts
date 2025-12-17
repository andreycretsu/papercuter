import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/server/supabase-admin";

const KEY_NAME = "papercuts_api_key";

function generateApiKey() {
  // 32 bytes => 64 hex chars
  return randomBytes(32).toString("hex");
}

declare global {
  // eslint-disable-next-line no-var
  var __papercutsApiKeyCache:
    | { value: string; fetchedAt: number }
    | undefined;
}

const CACHE_TTL_MS = 60_000;

export async function getOrCreatePapercutsApiKey(): Promise<string> {
  // Prefer explicit env override if provided.
  const envKey = process.env.PAPERCUTS_API_KEY?.trim();
  if (envKey) return envKey;

  const cached = globalThis.__papercutsApiKeyCache;
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY_NAME)
    .maybeSingle();

  if (error) throw error;

  let key = (data as any)?.value as string | undefined;
  if (!key) {
    key = generateApiKey();
    const { error: upsertError } = await supabase.from("app_settings").upsert(
      {
        key: KEY_NAME,
        value: key,
      },
      { onConflict: "key" }
    );
    if (upsertError) throw upsertError;
  }

  globalThis.__papercutsApiKeyCache = { value: key, fetchedAt: Date.now() };
  return key;
}

export async function rotatePapercutsApiKey(): Promise<string> {
  const envKey = process.env.PAPERCUTS_API_KEY?.trim();
  if (envKey) {
    // If env is set, rotation via DB would be misleading.
    return envKey;
  }

  const next = generateApiKey();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: KEY_NAME,
      value: next,
    },
    { onConflict: "key" }
  );
  if (error) throw error;

  globalThis.__papercutsApiKeyCache = { value: next, fetchedAt: Date.now() };
  return next;
}


