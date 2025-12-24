import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPapercutById, getPapercutActivity } from "@/server/papercuts-supabase-store";
import { PapercutDetailClient } from "@/components/papercut-detail-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = "force-dynamic";

export default async function PapercutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || undefined;

  let papercut;
  let activity;
  try {
    papercut = await getPapercutById(id, userEmail);
    activity = await getPapercutActivity(id);
  } catch {
    notFound();
  }

  if (!papercut) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <Link href="/papercuts-list">
            <Button variant="outline">← Back to list</Button>
          </Link>
        </div>

        <PapercutDetailClient papercut={papercut} initialActivity={activity} currentUserEmail={userEmail} />
      </div>
    </div>
  );
}
