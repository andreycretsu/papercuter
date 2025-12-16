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

export function PapercutFocusDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScreenshotUrl?: string | null;
  onCreated?: (created: {
    id: string;
    name: string;
    createdAt: string;
    descriptionHtml: string;
    screenshotUrl?: string | null;
  }) => void;
}) {
  const [name, setName] = React.useState("");
  const [descriptionHtml, setDescriptionHtml] = React.useState("");
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(
    props.initialScreenshotUrl ?? null
  );
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) return;
    setScreenshotUrl(props.initialScreenshotUrl ?? null);
  }, [props.open, props.initialScreenshotUrl]);

  const create = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      toast.error("Name is required");
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
    } catch {
      toast.error("Couldn’t create papercut");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className="h-[100svh] w-[100svw] max-w-none translate-x-[-50%] translate-y-[-50%] rounded-none border-0 p-0"
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl">New papercut</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" onClick={create} disabled={isSaving}>
                {isSaving ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex h-[calc(100svh-73px)] w-full flex-col gap-6 overflow-auto px-6 py-6">
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
              onChange={(e) => setName(e.target.value)}
              placeholder="Short title"
              className="h-11 text-[18px]"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <DescriptionEditor
              valueHtml={descriptionHtml}
              onChangeHtml={setDescriptionHtml}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


