import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

/**
 * Check if Jira is configured
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const configured = !!(
      process.env.JIRA_DOMAIN &&
      process.env.JIRA_EMAIL &&
      process.env.JIRA_API_TOKEN
    );

    return NextResponse.json({ configured });
  } catch (error) {
    return NextResponse.json({ configured: false });
  }
}
