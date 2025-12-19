import { ApiKeyCard } from "@/components/api-key-card";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        <ApiKeyCard />
      </div>
    </div>
  );
}
