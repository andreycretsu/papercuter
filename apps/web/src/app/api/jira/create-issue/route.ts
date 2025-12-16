import { NextResponse } from "next/server";

/**
 * Placeholder endpoint.
 *
 * Later we’ll implement:
 * - auth to Jira (OAuth or API token)
 * - mapping papercut fields -> Jira issue fields
 * - uploading/attaching the screenshot
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Jira integration not implemented yet. This endpoint is a placeholder.",
    },
    { status: 501 }
  );
}


