import Link from "next/link";
import { ApiKeyCard } from "@/components/api-key-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExtensionVersion } from "@/components/extension-version";
import { LogoutButton } from "@/components/settings-client";
import { JiraSettingsCard } from "@/components/jira-settings-card";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border w-full">
        <div className="mx-auto w-full px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold leading-tight">Settings</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Configure your API keys and integrations
              </div>
            </div>
            <div>
              <Link href="/">
                <Button variant="outline" className="h-10">
                  ← Back to list
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full px-6 py-6">

      <div className="space-y-6">
        <ApiKeyCard />

        <JiraSettingsCard />

        <Card className="border border-border p-6">
          <h2 className="text-xl font-semibold mb-2">Browser Extension</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Download the extension to load it manually in Chrome/Edge.
          </p>
          <Button asChild>
            <a href="/api/download-extension" download="papercuts-extension.zip">
              Download Extension
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            After downloading, unzip the file and load it unpacked in Chrome:
            <br />
            1. Go to chrome://extensions/
            <br />
            2. Enable "Developer mode"
            <br />
            3. Click "Load unpacked"
            <br />
            4. Select the unzipped folder
          </p>
          <ExtensionVersion />
        </Card>

          <div className="flex justify-end pt-4">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
