"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DescriptionEditor } from "@/components/description-editor";
import { PAPERCUT_MODULES, type PapercutModule, type Papercut } from "@/server/papercuts-supabase-store";

export function PapercutEditClient({ papercut }: { papercut: Papercut }) {
  const router = useRouter();
  const [name, setName] = React.useState(papercut.name);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [descriptionHtml, setDescriptionHtml] = React.useState(papercut.descriptionHtml);
  const [module, setModule] = React.useState<PapercutModule | "">(papercut.module || "");
  const [moduleError, setModuleError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setNameError(null);
    setModuleError(null);

    if (!name.trim()) {
      setNameError("Name is required.");
      return;
    }

    if (!module) {
      setModuleError("Module is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/papercuts/${papercut.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          descriptionHtml,
          module: module || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success("Papercut updated");
      router.push(`/papercuts/${papercut.id}`);
      router.refresh();
    } catch (error) {
      toast.error("Couldn't update papercut");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border border-border p-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Papercut</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the details of your papercut
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="papercut-name">Name *</Label>
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
            className={nameError ? 'border-destructive' : ''}
          />
          {nameError && (
            <p className="text-sm text-destructive">{nameError}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="papercut-module">Module *</Label>
          <select
            id="papercut-module"
            value={module}
            onChange={(e) => {
              setModule(e.target.value as PapercutModule | "");
              if (moduleError && e.target.value) {
                setModuleError(null);
              }
            }}
            onBlur={() => {
              if (!module) {
                setModuleError("Module is required.");
              }
            }}
            className={`flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${moduleError ? 'border-destructive' : ''}`}
          >
            <option value="">Select a module</option>
            {PAPERCUT_MODULES.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
          {moduleError && (
            <p className="text-sm text-destructive">{moduleError}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Description</Label>
          <DescriptionEditor
            valueHtml={descriptionHtml}
            onChangeHtml={setDescriptionHtml}
          />
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/papercuts/${papercut.id}`)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
