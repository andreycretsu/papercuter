import { NextResponse } from "next/server";
import { getOrCreatePapercutsApiKey } from "@/server/app-settings";

export async function requirePapercutsApiKey(
  req: Request
): Promise<NextResponse | null> {
  const expected = await getOrCreatePapercutsApiKey();

  const got = req.headers.get("x-papercuts-key")?.trim();
  if (!got || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}


