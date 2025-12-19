import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { Readable } from "stream";

export async function GET() {
  try {
    // Path to the built extension
    const extensionPath = path.join(
      process.cwd(),
      "..",
      "..",
      "apps",
      "extension",
      ".output",
      "chrome-mv3"
    );

    // Check if the extension build exists
    if (!fs.existsSync(extensionPath)) {
      return NextResponse.json(
        { error: "Extension build not found. Run 'npm run build' in apps/extension first." },
        { status: 404 }
      );
    }

    // Create a zip archive
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Add the extension folder to the archive
    archive.directory(extensionPath, false);

    // Finalize the archive
    await archive.finalize();

    // Convert archive stream to ReadableStream for Next.js Response
    const chunks: Buffer[] = [];
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return the zip file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="papercuts-extension.zip"',
      },
    });
  } catch (error) {
    console.error("[Download Extension] Error:", error);
    return NextResponse.json(
      { error: "Failed to create extension archive" },
      { status: 500 }
    );
  }
}
