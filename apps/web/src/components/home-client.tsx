"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";

import type { Papercut } from "@/server/papercuts-supabase-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PapercutFocusDialog } from "@/components/papercut-focus-dialog";
import { ApiKeyCard } from "@/components/api-key-card";

export function HomeClient(props: {
  initialPapercuts: Papercut[];
  initialError?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Papercut[]>(props.initialPapercuts);

  const refresh = async () => {
    try {
      const res = await fetch("/api/papercuts");
      const data = (await res.json()) as { items: Papercut[] };
      setItems(data.items ?? []);
    } catch {
      toast.error("Couldn’t load papercuts");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        {props.initialError ? (
          <Card className="border border-border p-4">
            <div className="text-[18px] font-semibold">Setup needed</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {props.initialError}
            </div>
          </Card>
        ) : null}

        <ApiKeyCard />

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold leading-tight">Papercuts</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Capture a screenshot, add a short description, and turn it into
              action later.
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="h-10">
            New papercut
          </Button>
        </div>

        <Separator />

        {items.length === 0 ? (
          <Card className="border border-border p-6">
            <div className="text-[18px] font-medium">No papercuts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Click “New papercut” to create one. You can also create from the
              extension later.
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {items.map((p) => (
              <Card key={p.id} className="border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-[18px] font-semibold">
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {p.screenshotUrl ? (
                    <div className="relative h-16 w-28 overflow-hidden rounded-md border border-border">
                      <Image
                        src={p.screenshotUrl}
                        alt=""
                        width={280}
                        height={160}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PapercutFocusDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => refresh()}
      />
    </div>
  );
}


