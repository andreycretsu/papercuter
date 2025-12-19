import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/server/auth";

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth Logout] Error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
