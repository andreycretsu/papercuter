import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, setAuthCookie } from "@/server/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body as { password?: string };

    if (!password || !verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    await setAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth Login] Error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
