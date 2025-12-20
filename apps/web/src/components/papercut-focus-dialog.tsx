"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DescriptionEditor } from "@/components/description-editor";
import { PAPERCUT_MODULES, type PapercutModule } from "@/server/papercuts-supabase-store";

export function PapercutFocusDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScreenshotUrl?: string | null;
  initialName?: string | null;
  initialDescriptionHtml?: string | null;
  onCreated?: (created: {
    id: string;
    name: string;
    createdAt: string;
    descriptionHtml: string;
    screenshotUrl?: string | null;
  }) => void;
}) {
  const [name, setName] = React.useState("");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [descriptionHtml, setDescriptionHtml] = React.useState("");
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(
    props.initialScreenshotUrl ?? null
  );
  const [module, setModule] = React.useState<PapercutModule | "">("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) return;
    setScreenshotUrl(props.initialScreenshotUrl ?? null);
    if (!name && props.initialName) setName(props.initialName);
    if (!descriptionHtml) {
      if (props.initialDescriptionHtml) setDescriptionHtml(props.initialDescriptionHtml);
      else if (props.initialScreenshotUrl) {
        setDescriptionHtml(
          `<p><img src="${props.initialScreenshotUrl}" alt="Screenshot" /></p>`
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.initialScreenshotUrl, props.initialName, props.initialDescriptionHtml]);

  const create = async () => {
    if (isSaving) return;
    setNameError(null);

    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/papercuts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          descriptionHtml,
          screenshotUrl,
          module: module || null,
        }),
      });
      const data = (await res.json()) as { item?: any; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Papercut created");
      props.onCreated?.(data.item);
      props.onOpenChange(false);
      setName("");
      setDescriptionHtml("");
      setScreenshotUrl(null);
      setModule("");
    } catch {
      toast.error("Couldn’t create papercut");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="h-[100svh] w-[100svw] max-w-none translate-x-[-50%] translate-y-[-50%] rounded-none border-0 p-0 bg-background"
        showCloseButton={false}
      >
        <div className="h-full w-full p-8">
          <div className="h-full w-full rounded-[20px] border border-gray-200 bg-white shadow-lg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-6 pb-4 flex-shrink-0">
              <DialogTitle className="text-2xl font-semibold">New papercut</DialogTitle>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto px-8 pb-24 space-y-6">
              {screenshotUrl ? (
                <div className="w-full">
                  <div className="mb-2 text-sm font-medium text-muted-foreground">
                    Screenshot
                  </div>
                  <div className="relative w-full overflow-hidden rounded-lg border border-border">
                    <Image
                      src={screenshotUrl}
                      alt="Screenshot"
                      width={1600}
                      height={900}
                      className="h-auto w-full"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="papercut-name">Name</Label>
                <Input
                  id="papercut-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError && e.target.value.trim()) {
                      setNameError(null);
                    }
                  }}
                  onBlur={() => {
                    if (!name.trim()) {
                      setNameError("Name is required.");
                    }
                  }}
                  placeholder="Short title"
                  className={`h-11 text-[18px] ${nameError ? 'border-destructive' : ''}`}
                  autoFocus
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="papercut-module">Module</Label>
                <select
                  id="papercut-module"
                  value={module}
                  onChange={(e) => setModule(e.target.value as PapercutModule | "")}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a module (optional)</option>
                  {PAPERCUT_MODULES.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <DescriptionEditor
                  valueHtml={descriptionHtml}
                  onChangeHtml={setDescriptionHtml}
                />
              </div>
            </div>

            {/* Sticky bottom panel */}
            <div className="flex-shrink-0 border-t border-border bg-background">
              <div className="px-8 py-4 flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => props.onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={create} disabled={isSaving}>
                  {isSaving ? "Creating…" : "Create papercut"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


