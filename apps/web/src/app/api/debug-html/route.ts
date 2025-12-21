import { NextResponse } from "next/server";
import { getPapercutById } from "@/server/papercuts-supabase-store";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET(req: Request) {
  // Require authentication for debug endpoint
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const papercut = await getPapercutById(id);

  if (!papercut) {
    return NextResponse.json({ error: "Papercut not found" }, { status: 404 });
  }

  const imgCount = (papercut.descriptionHtml.match(/<img/g) || []).length;

  return NextResponse.json({
    id: papercut.id,
    imageCount: imgCount,
    descriptionHtml: papercut.descriptionHtml,
    descriptionHtmlLength: papercut.descriptionHtml.length
  });
}
