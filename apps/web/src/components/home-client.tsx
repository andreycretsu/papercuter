"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import type { Papercut, PapercutStatus } from "@/server/papercuts-supabase-store";
import { PAPERCUT_MODULES, PAPERCUT_STATUSES } from "@/server/papercuts-supabase-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PapercutFocusDialog } from "@/components/papercut-focus-dialog";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function HomeClient(props: {
  initialPapercuts: Papercut[];
  initialError?: string | null;
  userRole: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Papercut[]>(props.initialPapercuts);
  const [prefillScreenshotUrl, setPrefillScreenshotUrl] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState<string>("all");
  const [emailFilter, setEmailFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Check if any filters are active
  const hasActiveFilters = searchQuery || moduleFilter !== "all" || emailFilter !== "all" || statusFilter !== "all";

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setModuleFilter("all");
    setEmailFilter("all");
    setStatusFilter("all");
  };

  const refresh = async () => {
    try {
      const res = await fetch("/api/papercuts");
      const data = (await res.json()) as { items: Papercut[] };
      setItems(data.items ?? []);
      setSelectedIds(new Set());
    } catch {
      toast.error("Couldn't load papercuts");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((p) => p.id)));
    }
  };

  // Get unique user emails for filter dropdown
  const uniqueEmails = React.useMemo(() => {
    const emails = new Set<string>();
    items.forEach((p) => {
      if (p.userEmail) emails.add(p.userEmail);
    });
    return Array.from(emails).sort();
  }, [items]);

  // Filter and search logic
  const filteredItems = React.useMemo(() => {
    return items.filter((p) => {
      // Search filter (name and description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDescription = p.descriptionHtml.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Module filter
      if (moduleFilter !== "all" && p.module !== moduleFilter) {
        return false;
      }

      // Email filter
      if (emailFilter !== "all" && p.userEmail !== emailFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, moduleFilter, emailFilter, statusFilter]);

  const handleDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0 || isDeleting) return;

    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      const res = await fetch("/api/papercuts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success(`Deleted ${selectedIds.size} papercut${selectedIds.size > 1 ? 's' : ''}`);
      await refresh();
    } catch {
      toast.error("Couldn't delete papercuts");
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkUpdateStatus = async (newStatus: PapercutStatus) => {
    if (selectedIds.size === 0 || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const updatePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/papercuts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      );

      const results = await Promise.all(updatePromises);
      const allSuccess = results.every((res) => res.ok);

      if (!allSuccess) {
        throw new Error("Some updates failed");
      }

      toast.success(`Updated ${selectedIds.size} papercut${selectedIds.size > 1 ? 's' : ''} to ${newStatus}`);
      await refresh();
    } catch {
      toast.error("Couldn't update papercut status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  React.useEffect(() => {
    // Avoid useSearchParams() to keep static builds happy on Vercel.
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get("new") === "1";
    if (!shouldOpen) return;
    const screenshotUrl = params.get("screenshotUrl");
    setPrefillScreenshotUrl(screenshotUrl);
    setOpen(true);

    // Clear params so refresh/back doesn’t keep re-opening the modal.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      url.searchParams.delete("screenshotUrl");
      url.searchParams.delete("from");
      url.searchParams.delete("ts");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold leading-tight">Papercuts</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Capture a screenshot, add a short description, and turn it into
                action later.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" className="h-10">
                  Dashboard
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </Button>
              </Link>
              <Button onClick={() => setOpen(true)} className="h-10">
                New papercut
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        {props.initialError ? (
          <Card className="border border-border p-4 mb-6">
            <div className="text-[18px] font-semibold">Setup needed</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {props.initialError}
            </div>
          </Card>
        ) : null}

        {items.length === 0 ? (
          <Card className="border border-border p-6">
            <div className="text-[18px] font-medium">No papercuts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Click "New papercut" to create one. You can also create from the
              extension later.
            </div>
          </Card>
        ) : (
          <>
            {/* Sticky search and filters */}
            <div className="sticky top-[89px] z-10 bg-background pb-4 mb-4 border-b border-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Segmented Status Filter */}
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      statusFilter === 'all'
                        ? 'bg-background text-foreground shadow'
                        : 'hover:bg-background/50'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('open')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      statusFilter === 'open'
                        ? 'bg-background text-foreground shadow'
                        : 'hover:bg-background/50'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setStatusFilter('resolved')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      statusFilter === 'resolved'
                        ? 'bg-background text-foreground shadow'
                        : 'hover:bg-background/50'
                    }`}
                  >
                    Resolved
                  </button>
                </div>

                <div className="flex-1">
                  <Input
                    type="search"
                    placeholder="Search papercuts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All modules</option>
                    {PAPERCUT_MODULES.map((mod) => (
                      <option key={mod} value={mod}>
                        {mod}
                      </option>
                    ))}
                  </select>
                  <select
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All users</option>
                    {uniqueEmails.map((email) => (
                      <option key={email} value={email}>
                        {email}
                      </option>
                    ))}
                  </select>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="h-9"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <Card className="border border-border p-6">
                <div className="text-[18px] font-medium">No matching papercuts</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all
                  </span>
                </div>
                <div className="grid gap-4">
                  {filteredItems.map((p) => (
                <div key={p.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelection(p.id);
                    }}
                    className="mt-5 h-4 w-4 rounded border-border flex-shrink-0"
                  />
                  <Link href={`/papercuts/${p.id}`} className="flex-1">
                    <Card className="border border-border p-4 hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-[18px] font-semibold">
                              {p.name}
                            </div>
                            {p.module && (
                              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 flex-shrink-0">
                                {p.module}
                              </span>
                            )}
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset flex-shrink-0 ${
                              p.status === 'resolved'
                                ? 'bg-green-50 text-green-700 ring-green-700/10'
                                : 'bg-yellow-50 text-yellow-700 ring-yellow-700/10'
                            }`}>
                              {p.status === 'resolved' ? 'Resolved' : 'Open'}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            <div>{new Date(p.createdAt).toLocaleString()}</div>
                            {p.userEmail && (
                              <div className="flex items-center gap-1">
                                <span>Created by:</span>
                                <span className="font-medium">{p.userEmail}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {p.screenshotUrl ? (
                          <div className="relative h-16 w-28 overflow-hidden rounded-md border border-border flex-shrink-0">
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
                  </Link>
                </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PapercutFocusDialog
        open={open}
        onOpenChange={setOpen}
        initialScreenshotUrl={prefillScreenshotUrl}
        onCreated={() => refresh()}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} papercut{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected papercuts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2"
          style={{
            zIndex: 999999,
            pointerEvents: 'auto',
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <Card className="border border-border shadow-xl bg-background p-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} papercut{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateStatus('resolved')}
                  disabled={isUpdatingStatus || isDeleting}
                >
                  Mark as Resolved
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateStatus('open')}
                  disabled={isUpdatingStatus || isDeleting}
                >
                  Mark as Open
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteClick}
                  disabled={isDeleting || isUpdatingStatus}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={isUpdatingStatus || isDeleting}
                  className="hover:bg-accent h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


