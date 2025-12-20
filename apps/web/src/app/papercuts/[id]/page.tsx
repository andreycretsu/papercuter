import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPapercutById } from "@/server/papercuts-supabase-store";
import { PapercutDetailClient } from "@/components/papercut-detail-client";

export const dynamic = "force-dynamic";

export default async function PapercutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
          <Link href="/">
            <Button variant="outline">← Back to list</Button>
          </Link>
        </div>

        <PapercutDetailClient papercut={papercut} />
      </div>
    </div>
  );
}
