import { NextResponse } from "next/server";
import { getPapercutById } from "@/server/papercuts-supabase-store";

export async function GET(req: Request) {
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
