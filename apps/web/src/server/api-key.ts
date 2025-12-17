import { NextResponse } from "next/server";

export function requirePapercutsApiKey(req: Request): NextResponse | null {
  const expected = process.env.PAPERCUTS_API_KEY?.trim();
  if (!expected) return null; // not enforced

  const got = req.headers.get("x-papercuts-key")?.trim();
  if (!got || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}


