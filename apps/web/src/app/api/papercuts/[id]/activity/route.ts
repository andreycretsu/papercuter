import { NextRequest, NextResponse } from "next/server";
import { getPapercutActivity } from "@/server/papercuts-supabase-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const activity = await getPapercutActivity(id);
    return NextResponse.json({ activity });
  } catch (error) {
    console.error("[Get Papercut Activity] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch papercut activity" },
      { status: 500 }
    );
  }
}
