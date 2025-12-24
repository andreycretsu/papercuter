import { MainLayout } from "@/components/main-layout";
import { listPapercutsSupabase } from "@/server/papercuts-supabase-store";
import type { Papercut } from "@/server/papercuts-supabase-store";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = "force-dynamic";

export default async function Home() {
  let papercuts: Papercut[] = [];
  let setupError: string | null = null;

  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || 'editor';
  const userEmail = session?.user?.email || undefined;

  try {
    papercuts = await listPapercutsSupabase(undefined, userEmail);
  } catch {
    setupError =
      "Backend is not configured yet. Add Supabase + Cloudinary keys in apps/web/.env.local, then restart.";
  }

  return (
    <MainLayout
      initialPapercuts={papercuts}
      initialError={setupError}
      userRole={userRole}
      initialTab="dashboard"
    />
  );
}
