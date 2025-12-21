import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Try built extension first, then fall back to source
    const builtVersionPath = path.join(
      process.cwd(),
      "..",
      "..",
      "apps",
      "extension",
      ".output",
      "chrome-mv3",
      "version.json"
    );

    const sourceVersionPath = path.join(
      process.cwd(),
      "..",
      "..",
      "apps",
      "extension",
      "version.json"
    );

    const versionPath = fs.existsSync(builtVersionPath)
      ? builtVersionPath
      : sourceVersionPath;

    if (!fs.existsSync(versionPath)) {
      return NextResponse.json(
        {
          version: "0.0.0",
          hash: "unknown",
          date: new Date().toISOString().split('T')[0],
          branch: "unknown",
          timestamp: new Date().toISOString(),
          downloadUrl: "/api/download-extension",
        },
        { status: 200 }
      );
    }

    const versionData = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
    return NextResponse.json({
      ...versionData,
      downloadUrl: "/api/download-extension",
    });
  } catch (error) {
    console.error("[Extension Version] Error:", error);
    return NextResponse.json(
      {
        version: "0.0.0",
        hash: "unknown",
        date: new Date().toISOString().split('T')[0],
        branch: "unknown",
        timestamp: new Date().toISOString(),
        downloadUrl: "/api/download-extension",
      },
      { status: 200 }
    );
  }
}
