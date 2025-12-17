import { NextResponse } from "next/server";
import {
  getOrCreatePapercutsApiKey,
  rotatePapercutsApiKey,
} from "@/server/app-settings";

export async function GET() {
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


