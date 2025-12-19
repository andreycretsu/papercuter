import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase-admin";
import { requirePapercutsApiKey } from "@/server/require-papercuts-api-key";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("papercuts")
      .delete()
      .eq("id", params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Delete Papercut] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete papercut" },
      { status: 500 }
    );
  }
}
