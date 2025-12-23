import { NextResponse } from "next/server";
import {
  createPapercutSupabase,
  listPapercutsSupabase,
  PAPERCUT_TYPES,
} from "@/server/papercuts-supabase-store";
import { requirePapercutsApiKey } from "@/server/api-key";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  // Require authentication for reading papercuts
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listPapercutsSupabase(undefined, session.user.email);
    return NextResponse.json({ items });
  } catch (error) {
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
    type?: unknown;
  };

  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const descriptionHtml =
    typeof body.descriptionHtml === "string" ? body.descriptionHtml : "";
  const screenshotUrl =
    typeof body.screenshotUrl === "string" ? body.screenshotUrl : null;
  const module =
    typeof body.module === "string" && body.module.trim() ? body.module : null;
  const type =
    typeof body.type === "string" && PAPERCUT_TYPES.includes(body.type as any)
      ? body.type
      : 'UXUI';

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
      type: type as any,
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create papercut",
        details: process.env.NODE_ENV === 'development' ? (error as any)?.message : undefined
      },
      { status: 500 }
    );
  }
}


