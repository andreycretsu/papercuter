import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPapercutById, getPapercutActivity } from "@/server/papercuts-supabase-store";
import { PapercutDetailClient } from "@/components/papercut-detail-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const papercut = await getPapercutById(id);

    if (!papercut) {
      console.error('[generateMetadata] Papercut not found:', id);
      return {
        title: "Papercut Not Found",
        description: "This papercut could not be found",
        openGraph: {
          title: "Papercut Not Found",
          description: "This papercut could not be found",
          type: 'website' as const,
        },
      };
    }

    console.log('[generateMetadata] Found papercut:', {
      id: papercut.id,
      name: papercut.name,
      hasScreenshot: !!papercut.screenshotUrl,
      screenshotUrl: papercut.screenshotUrl,
    });

    // Strip HTML tags from description for plain text (server-side)
    let description = papercut.descriptionHtml.replace(/<[^>]*>/g, '').trim();

    // Truncate description to 200 characters
    const truncatedDescription = description.length > 200
      ? description.substring(0, 200) + '...'
      : description;

    const ogDescription = truncatedDescription || 'View this papercut on Cleaqops';
    const ogImage = papercut.screenshotUrl || null;

    const metadata: Metadata = {
      title: papercut.name,
      description: ogDescription,
      openGraph: {
        title: papercut.name,
        description: ogDescription,
        url: `https://cleaqops.com/papercuts/${id}`,
        siteName: 'Cleaqops Papercuts',
        type: 'website' as const,
        ...(ogImage ? {
          images: [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: papercut.name,
              type: 'image/jpeg',
            }
          ],
        } : {}),
      },
      twitter: {
        card: 'summary_large_image' as const,
        title: papercut.name,
        description: ogDescription,
        ...(ogImage ? {
          images: [ogImage],
        } : {}),
      },
      // Additional metadata for better compatibility
      other: {
        ...(ogImage ? {
          'og:image:secure_url': ogImage,
          'og:image:type': 'image/jpeg',
          'og:image:width': '1200',
          'og:image:height': '630',
        } : {}),
      },
    };

    console.log('[generateMetadata] Generated metadata:', JSON.stringify(metadata, null, 2));

    return metadata;
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: "Papercut Not Found",
      description: "Error loading papercut",
      openGraph: {
        title: "Papercut Not Found",
        description: "Error loading papercut",
        type: 'website' as const,
      },
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
