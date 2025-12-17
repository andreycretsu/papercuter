import { HomeClient } from "@/components/home-client";
import { listPapercutsSupabase } from "@/server/papercuts-supabase-store";
import type { Papercut } from "@/server/papercuts-supabase-store";

export default async function Home() {
  let papercuts: Papercut[] = [];
  let setupError: string | null = null;
  try {
    papercuts = await listPapercutsSupabase();
  } catch {
    setupError =
      "Backend is not configured yet. Add Supabase + Cloudinary keys in apps/web/.env.local, then restart.";
  }
  return (
    <HomeClient initialPapercuts={papercuts} initialError={setupError} />
  );
}
