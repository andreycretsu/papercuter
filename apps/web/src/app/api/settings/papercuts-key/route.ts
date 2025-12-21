import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import {
  getOrCreatePapercutsApiKey,
  rotatePapercutsApiKey,
} from "@/server/app-settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const key = await getOrCreatePapercutsApiKey();
    return NextResponse.json({ key });
  } catch {
    return NextResponse.json(
      { error: "Failed to load API key" },
      { status: 500 }
    );
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const key = await rotatePapercutsApiKey();
    return NextResponse.json({ key });
  } catch {
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}


