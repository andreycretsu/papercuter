import { NextResponse } from "next/server";
import { getOrCreatePapercutsApiKey } from "@/server/app-settings";

export async function requirePapercutsApiKey(
  req: Request
): Promise<NextResponse | null> {
  // Allow same-origin browser requests without the key (web UI)
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const reqOrigin = new URL(req.url).origin;
      if (origin === reqOrigin) return null;
    } catch {
      // fallthrough
    }
  }

  const expected = await getOrCreatePapercutsApiKey();

  const got = req.headers.get("x-papercuts-key")?.trim();
  if (!got || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}


