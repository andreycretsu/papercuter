"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export function JiraSettingsCard() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [projectKey, setProjectKey] = useState("");

  useEffect(() => {
    checkJiraConfig();
  }, []);

  const checkJiraConfig = async () => {
    try {
      const res = await fetch('/api/jira/config');
      const data = await res.json();
      setIsConfigured(data.configured || false);
    } catch (error) {
      console.error('Failed to check Jira config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/jira/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          email,
          apiToken,
          projectKey
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save Jira configuration');
      }

      setMessage({ type: 'success', text: 'Jira configuration saved successfully!' });
      setIsConfigured(true);

      // Clear form
      setDomain("");
      setEmail("");
      setApiToken("");
      setProjectKey("");

    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save Jira configuration. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-border p-6">
        <p className="text-sm text-muted-foreground">Loading Jira settings...</p>
      </Card>
    );
  }

  return (
    <Card className="border border-border p-6">
      <h2 className="text-xl font-semibold mb-2">Jira Integration</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Connect to Jira to create issues directly from papercuts.
        {isConfigured && (
          <span className="block mt-1 text-green-600 font-medium">
            ✓ Jira is configured (environment variables set)
          </span>
        )}
      </p>

      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Jira integration requires server environment variables.
            Contact your administrator to configure JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN,
            and JIRA_PROJECT_KEY in the deployment environment.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Setup Instructions:</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create or use a Jira service account (e.g., papercuts-bot@yourcompany.com) with permission to create issues</li>
            <li>Generate an API token for that account at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Atlassian API Tokens</a></li>
            <li>Add the following environment variables to your deployment:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">JIRA_DOMAIN</code> - Your Jira domain (e.g., yourcompany.atlassian.net)</li>
                <li><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">JIRA_EMAIL</code> - Service account email (e.g., papercuts-bot@yourcompany.com)</li>
                <li><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">JIRA_API_TOKEN</code> - The API token for the service account</li>
                <li><code className="text-xs bg-gray-100 px-1 py-0.5 rounded">JIRA_PROJECT_KEY</code> - Your Jira project key (e.g., PROJ)</li>
              </ul>
            </li>
            <li>Restart your application</li>
          </ol>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            Once configured, you'll see a "Create Jira Issue" option in the papercut detail page.
            The integration works with both standard Jira projects and Jira Product Discovery.
            Each Jira issue will show "Reported by: [user's email]" to preserve the actual creator's identity.
          </p>
        </div>
      </div>
    </Card>
  );
}
