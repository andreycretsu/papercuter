import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Path to the packaged extension in public folder
    const extensionPath = path.join(
      process.cwd(),
      "public",
      "papercuts-extension.zip"
    );

    // Check if the extension package exists
    if (!fs.existsSync(extensionPath)) {
      return NextResponse.json(
        { error: "Extension package not found. The extension needs to be built and packaged." },
        { status: 404 }
      );
    }

    // Read the zip file
    const buffer = fs.readFileSync(extensionPath);

    // Return the zip file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="papercuts-extension.zip"',
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[Download Extension] Error:", error);
    return NextResponse.json(
      { error: "Failed to download extension package" },
      { status: 500 }
    );
  }
}
