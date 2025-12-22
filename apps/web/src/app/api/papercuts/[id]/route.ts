import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/server/supabase-admin";
import { requirePapercutsApiKey } from "@/server/api-key";
import { updatePapercutStatus, PAPERCUT_STATUSES, PAPERCUT_MODULES, PAPERCUT_TYPES } from "@/server/papercuts-supabase-store";
import type { PapercutStatus, PapercutModule, PapercutType } from "@/server/papercuts-supabase-store";

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requirePapercutsApiKey(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const body = (await req.json().catch(() => null)) as null | {
    name?: unknown;
    descriptionHtml?: unknown;
    module?: unknown;
    type?: unknown;
  };

  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const name = body.name.trim();
  const descriptionHtml = typeof body.descriptionHtml === "string" ? body.descriptionHtml : "";
  const module = typeof body.module === "string" && body.module.trim() ? body.module : null;
  const type = typeof body.type === "string" && body.type.trim() ? body.type : null;

  if (module && !PAPERCUT_MODULES.includes(module as PapercutModule)) {
    return NextResponse.json(
      { error: "Invalid module" },
      { status: 400 }
    );
  }

  if (type && !PAPERCUT_TYPES.includes(type as PapercutType)) {
    return NextResponse.json(
      { error: "Invalid type" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const updateData: any = {
      name,
      description_html: descriptionHtml,
      module,
    };

    if (type) {
      updateData.type = type;
    }

    const { error } = await supabase
      .from("papercuts")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Update Papercut] Error:", error);
    return NextResponse.json(
      { error: "Failed to update papercut" },
      { status: 500 }
    );
  }
}
