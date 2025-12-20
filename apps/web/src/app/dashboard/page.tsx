import { DashboardClient } from "@/components/dashboard-client";
import { listPapercutsSupabase } from "@/server/papercuts-supabase-store";
import type { Papercut } from "@/server/papercuts-supabase-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let papercuts: Papercut[] = [];
  let setupError: string | null = null;
  try {
    papercuts = await listPapercutsSupabase();
  } catch {
    setupError =
      "Backend is not configured yet. Add Supabase + Cloudinary keys in apps/web/.env.local, then restart.";
  }
  return (
    <DashboardClient initialPapercuts={papercuts} initialError={setupError} />
  );
}
