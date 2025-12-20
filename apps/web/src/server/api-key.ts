import { NextResponse } from "next/server";
import { getOrCreatePapercutsApiKey } from "@/server/app-settings";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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

  // Also allow authenticated users (web UI with NextAuth session)
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    console.log("[API Key] Authenticated user bypassing API key check:", session.user.email);
    return null;
  }

  // Otherwise, require API key (for extension)
  const expected = await getOrCreatePapercutsApiKey();

  const got = req.headers.get("x-papercuts-key")?.trim();
  if (!got || got !== expected) {
    console.error("[API Key] Unauthorized request - no valid session or API key");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}


