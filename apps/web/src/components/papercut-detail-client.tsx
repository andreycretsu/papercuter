"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk';

type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
  userEmail?: string | null;
  module?: PapercutModule | null;
};

export function PapercutDetailClient({ papercut }: { papercut: Papercut }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/papercuts/${papercut.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Papercut deleted");
      router.push("/");
    } catch {
      toast.error("Couldn't delete papercut");
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <Card className="border border-border p-8">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {papercut.name}
              </h1>
              {papercut.module && (
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {papercut.module}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div>Created {new Date(papercut.createdAt).toLocaleString()}</div>
              {papercut.userEmail && (
                <div className="flex items-center gap-1">
                  <span>Created by:</span>
                  <span className="font-medium">{papercut.userEmail}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showConfirm ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {papercut.screenshotUrl && (
          <div className="relative w-full overflow-hidden rounded-lg border border-border">
            <Image
              src={papercut.screenshotUrl}
              alt="Screenshot"
              width={1200}
              height={800}
              className="w-full h-auto object-contain"
              priority
            />
          </div>
        )}

        {papercut.descriptionHtml && (
          <div className="prose prose-neutral max-w-none">
            <div
              dangerouslySetInnerHTML={{ __html: papercut.descriptionHtml }}
              className="text-foreground"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
