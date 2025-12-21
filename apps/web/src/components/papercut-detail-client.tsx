"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk';
type PapercutStatus = 'open' | 'resolved';

type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
  userEmail?: string | null;
  module?: PapercutModule | null;
  status: PapercutStatus;
};

export function PapercutDetailClient({ papercut }: { papercut: Papercut }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState<PapercutStatus>(papercut.status);

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

  const handleResolve = async () => {
    if (isUpdatingStatus) return;

    const newStatus: PapercutStatus = currentStatus === 'open' ? 'resolved' : 'open';
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/papercuts/${papercut.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      setCurrentStatus(newStatus);
      toast.success(newStatus === 'resolved' ? "Papercut resolved" : "Papercut reopened");
      router.refresh();
    } catch {
      toast.error("Couldn't update papercut status");
    } finally {
      setIsUpdatingStatus(false);
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
              <span className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium ring-1 ring-inset ${
                currentStatus === 'resolved'
                  ? 'bg-green-50 text-green-700 ring-green-700/10'
                  : 'bg-yellow-50 text-yellow-700 ring-yellow-700/10'
              }`}>
                {currentStatus === 'resolved' ? 'Resolved' : 'Open'}
              </span>
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
            {!showConfirm && (
              <>
                <Link href={`/papercuts/${papercut.id}/edit`}>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResolve}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Updating..." : currentStatus === 'open' ? "Resolve" : "Reopen"}
                </Button>
              </>
            )}
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

        {papercut.descriptionHtml && (
          <div className="prose prose-neutral max-w-none">
            <style jsx>{`
              .prose img {
                max-width: 672px;
                width: auto;
                height: auto;
                border-radius: 0.5rem;
                border: 1px solid hsl(var(--border));
                margin: 0.75rem 0;
                display: block;
              }
            `}</style>
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
