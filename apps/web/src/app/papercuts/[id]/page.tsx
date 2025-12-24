import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPapercutById, getPapercutActivity } from "@/server/papercuts-supabase-store";
import { PapercutDetailClient } from "@/components/papercut-detail-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const papercut = await getPapercutById(id);

    if (!papercut) {
      return {
        title: "Papercut Not Found",
      };
    }

    // Strip HTML tags from description for plain text (server-side)
    let description = papercut.descriptionHtml.replace(/<[^>]*>/g, '').trim();

    // Truncate description to 200 characters
    const truncatedDescription = description.length > 200
      ? description.substring(0, 200) + '...'
      : description;

    return {
      title: `${papercut.name} | Cleaqops Papercuts`,
      description: truncatedDescription || 'View this papercut on Cleaqops',
      openGraph: {
        title: papercut.name,
        description: truncatedDescription || 'View this papercut on Cleaqops',
        siteName: 'Cleaqops Papercuts',
        images: papercut.screenshotUrl ? [
          {
            url: papercut.screenshotUrl,
            width: 1200,
            height: 630,
            alt: papercut.name,
          }
        ] : [],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: papercut.name,
        description: truncatedDescription || 'View this papercut on Cleaqops',
        images: papercut.screenshotUrl ? [papercut.screenshotUrl] : [],
      },
    };
  } catch {
    return {
      title: "Papercut Not Found",
    };
  }
}

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
      <div className="py-10">
        <div className="mb-6 px-6">
          <Link href="/?tab=papercuts">
            <Button variant="outline">← Back to list</Button>
          </Link>
        </div>

        <PapercutDetailClient papercut={papercut} initialActivity={activity} currentUserEmail={userEmail} />
      </div>
    </div>
  );
}
