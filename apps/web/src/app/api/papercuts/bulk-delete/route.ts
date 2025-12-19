import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase-admin";
import { requirePapercutsApiKey } from "@/server/api-key";

export async function POST(req: NextRequest) {
  const unauthorized = await requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { ids } = body as { ids?: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No IDs provided" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("papercuts")
      .delete()
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("[Bulk Delete Papercuts] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete papercuts" },
      { status: 500 }
    );
  }
}
