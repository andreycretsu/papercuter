import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

/**
 * Fetches available Jira projects
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Jira is configured
    const jiraDomain = process.env.JIRA_DOMAIN;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;

    if (!jiraDomain || !jiraEmail || !jiraApiToken) {
      return NextResponse.json(
        { error: "Jira integration is not configured" },
        { status: 503 }
      );
    }

    const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');

    // Fetch projects from Jira
    const response = await fetch(
      `https://${jiraDomain}/rest/api/3/project/search`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Jira] Failed to fetch projects:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch Jira projects' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return simplified project list
    const projects = data.values.map((project: any) => ({
      key: project.key,
      name: project.name,
      id: project.id
    }));

    return NextResponse.json({ projects });

  } catch (error) {
    console.error('[Jira] Error fetching projects:', error);
    return NextResponse.json(
      { error: "Failed to fetch Jira projects" },
      { status: 500 }
    );
  }
}
