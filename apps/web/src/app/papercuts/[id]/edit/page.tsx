import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPapercutById } from "@/server/papercuts-supabase-store";
import { PapercutEditClient } from "@/components/papercut-edit-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const dynamic = "force-dynamic";

export default async function PapercutEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || undefined;

  let papercut;
  try {
    papercut = await getPapercutById(id);
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
          <Link href={`/papercuts/${id}`}>
            <Button variant="outline">← Back to papercut</Button>
          </Link>
        </div>

        <PapercutEditClient papercut={papercut} currentUserEmail={userEmail} />
      </div>
    </div>
  );
}
