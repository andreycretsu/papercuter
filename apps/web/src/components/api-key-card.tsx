"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ApiKeyCard() {
  const [key, setKey] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [rotating, setRotating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/papercuts-key");
      const data = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || !data.key) throw new Error(data.error || "Failed");
      setKey(data.key);
    } catch {
      toast.error("Couldn’t load API key");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const copy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast.success("API key copied");
    } catch {
      toast.error("Couldn’t copy");
    }
  };

  const rotate = async () => {
    if (rotating) return;
    setRotating(true);
    try {
      const res = await fetch("/api/settings/papercuts-key", { method: "POST" });
      const data = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || !data.key) throw new Error(data.error || "Failed");
      setKey(data.key);
      toast.success("API key rotated");
    } catch {
      toast.error("Couldn’t rotate API key");
    } finally {
      setRotating(false);
    }
  };

  return (
    <Card className="border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[18px] font-semibold">Extension API key</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Copy this into the extension popup “API key” field.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={rotate} disabled={loading || rotating}>
            {rotating ? "Rotating…" : "Rotate"}
          </Button>
          <Button onClick={copy} disabled={loading || !key}>
            Copy
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Input value={loading ? "Loading…" : key} readOnly className="h-11" />
      </div>
    </Card>
  );
}


