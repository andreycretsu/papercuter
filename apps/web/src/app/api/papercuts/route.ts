import { NextResponse } from "next/server";
import {
  createPapercutSupabase,
  listPapercutsSupabase,
} from "@/server/papercuts-supabase-store";
import { requirePapercutsApiKey } from "@/server/api-key";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  // Reads are allowed without API key (so the web UI works normally).
  try {
    const items = await listPapercutsSupabase();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/papercuts] Error loading papercuts:", error);
    return NextResponse.json(
      { error: "Failed to load papercuts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const unauthorized = await requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => null)) as null | {
    name?: unknown;
    descriptionHtml?: unknown;
    screenshotUrl?: unknown;
    module?: unknown;
  };

  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const descriptionHtml =
    typeof body.descriptionHtml === "string" ? body.descriptionHtml : "";
  const screenshotUrl =
    typeof body.screenshotUrl === "string" ? body.screenshotUrl : null;
  const module =
    typeof body.module === "string" ? body.module : null;

  // Get the user's session to track who created the papercut
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || null;

  try {
    const created = await createPapercutSupabase({
      name: body.name,
      descriptionHtml,
      screenshotUrl,
      userEmail,
      module: module as any,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/papercuts] Error creating papercut:", error);
    return NextResponse.json(
      { error: "Failed to create papercut" },
      { status: 500 }
    );
  }
}


