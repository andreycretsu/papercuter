import Link from "next/link";
import { ApiKeyCard } from "@/components/api-key-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExtensionVersion } from "@/components/extension-version";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline">← Back to list</Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <ApiKeyCard />

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
      </div>
    </div>
  );
}
