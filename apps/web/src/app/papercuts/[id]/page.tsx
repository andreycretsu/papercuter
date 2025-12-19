import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPapercutById } from "@/server/papercuts-supabase-store";

export const dynamic = "force-dynamic";

export default async function PapercutPage({
  params,
}: {
  params: { id: string };
}) {
  let papercut;
  try {
    papercut = await getPapercutById(params.id);
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

        <Card className="border border-border p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {papercut.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Created {new Date(papercut.createdAt).toLocaleString()}
              </p>
            </div>

            {papercut.screenshotUrl && (
              <div className="relative w-full overflow-hidden rounded-lg border border-border">
                <Image
                  src={papercut.screenshotUrl}
                  alt="Screenshot"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            )}

            {papercut.descriptionHtml && (
              <div className="prose prose-neutral max-w-none">
                <div
                  dangerouslySetInnerHTML={{ __html: papercut.descriptionHtml }}
                  className="text-foreground"
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
