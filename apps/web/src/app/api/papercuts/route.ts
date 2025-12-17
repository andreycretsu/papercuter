import { NextResponse } from "next/server";
import {
  createPapercutSupabase,
  listPapercutsSupabase,
} from "@/server/papercuts-supabase-store";
import { requirePapercutsApiKey } from "@/server/api-key";

export async function GET() {
  // Reads are allowed without API key (so the web UI works normally).
  try {
    const items = await listPapercutsSupabase();
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Failed to load papercuts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const unauthorized = requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => null)) as null | {
    name?: unknown;
    descriptionHtml?: unknown;
    screenshotUrl?: unknown;
  };

  if (!body || typeof body.name !== "string") {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const descriptionHtml =
    typeof body.descriptionHtml === "string" ? body.descriptionHtml : "";
  const screenshotUrl =
    typeof body.screenshotUrl === "string" ? body.screenshotUrl : null;

  try {
    const created = await createPapercutSupabase({
      name: body.name,
      descriptionHtml,
      screenshotUrl,
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create papercut" },
      { status: 500 }
    );
  }
}


