import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase-admin";
import { requirePapercutsApiKey } from "@/server/api-key";
import { updatePapercutStatus, PAPERCUT_STATUSES } from "@/server/papercuts-supabase-store";
import type { PapercutStatus } from "@/server/papercuts-supabase-store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("papercuts")
      .delete()
      .eq("id", id);

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const body = (await req.json().catch(() => null)) as null | {
    status?: unknown;
  };

  if (!body || typeof body.status !== "string" || !PAPERCUT_STATUSES.includes(body.status as PapercutStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be 'open' or 'resolved'" },
      { status: 400 }
    );
  }

  try {
    await updatePapercutStatus(id, body.status as PapercutStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Update Papercut Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to update papercut status" },
      { status: 500 }
    );
  }
}
