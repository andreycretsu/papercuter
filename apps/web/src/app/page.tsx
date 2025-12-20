import { HomeClient } from "@/components/home-client";
import { listPapercutsSupabase } from "@/server/papercuts-supabase-store";
import type { Papercut } from "@/server/papercuts-supabase-store";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = "force-dynamic";

export default async function Home() {
  let papercuts: Papercut[] = [];
  let setupError: string | null = null;
  try {
    papercuts = await listPapercutsSupabase();
  } catch {
    setupError =
      "Backend is not configured yet. Add Supabase + Cloudinary keys in apps/web/.env.local, then restart.";
  }

  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || 'editor';

  return (
    <HomeClient
      initialPapercuts={papercuts}
      initialError={setupError}
      userRole={userRole}
    />
  );
}
