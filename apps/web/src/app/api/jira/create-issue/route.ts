import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Creates a Jira issue from a papercut.
 *
 * Request body:
 * {
 *   papercutId: string,
 *   name: string,
 *   description: string,
 *   screenshotUrl?: string,
 *   module?: string,
 *   type?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Jira is configured
    const jiraDomain = process.env.JIRA_DOMAIN;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const jiraProjectKey = process.env.JIRA_PROJECT_KEY;

    if (!jiraDomain || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
      return NextResponse.json(
        { error: "Jira integration is not configured. Please set JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY environment variables." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, description, screenshotUrl, module, type } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Create Jira issue description
    let jiraDescription = description || "";

    // Add metadata to description
    if (module) {
      jiraDescription = `*Module:* ${module}\n\n${jiraDescription}`;
    }
    if (type) {
      jiraDescription = `*Type:* ${type}\n\n${jiraDescription}`;
    }

    // Add screenshot link if available
    if (screenshotUrl) {
      jiraDescription += `\n\n*Screenshot:* ${screenshotUrl}`;
    }

    // Create the Jira issue
    const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');

    const issuePayload = {
      fields: {
        project: {
          key: jiraProjectKey
        },
        summary: name,
        description: jiraDescription,
        issuetype: {
          name: "Task" // Default to Task, can be customized
        }
      }
    };

    const createResponse = await fetch(
      `https://${jiraDomain}/rest/api/3/issue`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issuePayload)
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[Jira] Failed to create issue:', errorText);
      return NextResponse.json(
        { error: `Failed to create Jira issue: ${createResponse.statusText}` },
        { status: createResponse.status }
      );
    }

    const issueData = await createResponse.json();
    const issueKey = issueData.key;
    const issueUrl = `https://${jiraDomain}/browse/${issueKey}`;

    // If there's a screenshot, try to attach it
    if (screenshotUrl) {
      try {
        // Download the image
        const imageResponse = await fetch(screenshotUrl);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBlob = new Blob([imageBuffer]);

          // Determine filename from URL or use default
          const urlParts = screenshotUrl.split('/');
          const filename = urlParts[urlParts.length - 1] || 'screenshot.png';

          // Create form data for attachment
          const formData = new FormData();
          formData.append('file', imageBlob, filename);

          // Attach to Jira issue
          await fetch(
            `https://${jiraDomain}/rest/api/3/issue/${issueKey}/attachments`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'X-Atlassian-Token': 'no-check'
              },
              body: formData
            }
          );
        }
      } catch (attachError) {
        console.error('[Jira] Failed to attach screenshot:', attachError);
        // Don't fail the whole request if attachment fails
      }
    }

    return NextResponse.json({
      success: true,
      issueKey,
      issueUrl
    });

  } catch (error) {
    console.error('[Jira] Error creating issue:', error);
    return NextResponse.json(
      { error: "Failed to create Jira issue" },
      { status: 500 }
    );
  }
}
