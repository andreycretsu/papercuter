"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

import type { Papercut } from "@/server/papercuts-supabase-store";
import { PAPERCUT_MODULES } from "@/server/papercuts-supabase-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PapercutFocusDialog } from "@/components/papercut-focus-dialog";

export function HomeClient(props: {
  initialPapercuts: Papercut[];
  initialError?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Papercut[]>(props.initialPapercuts);
  const [prefillScreenshotUrl, setPrefillScreenshotUrl] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState<string>("all");
  const [emailFilter, setEmailFilter] = React.useState<string>("all");

  // Check if any filters are active
  const hasActiveFilters = searchQuery || moduleFilter !== "all" || emailFilter !== "all";

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setModuleFilter("all");
    setEmailFilter("all");
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

      return true;
    });
  }, [items, searchQuery, moduleFilter, emailFilter]);

  const bulkDelete = async () => {
    if (selectedIds.size === 0 || isDeleting) return;

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        {props.initialError ? (
          <Card className="border border-border p-4">
            <div className="text-[18px] font-semibold">Setup needed</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {props.initialError}
            </div>
          </Card>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold leading-tight">Papercuts</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Capture a screenshot, add a short description, and turn it into
              action later.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete selected"}
                </Button>
              </>
            )}
            <Link href="/settings">
              <Button variant="outline" className="h-10">
                Settings
              </Button>
            </Link>
            <Button onClick={() => setOpen(true)} className="h-10">
              New papercut
            </Button>
          </div>
        </div>

        <Separator />

        {items.length === 0 ? (
          <Card className="border border-border p-6">
            <div className="text-[18px] font-medium">No papercuts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Click "New papercut" to create one. You can also create from the
              extension later.
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Search and filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

            {/* Results count */}
            {hasActiveFilters && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredItems.length} of {items.length} papercuts
              </div>
            )}

            {filteredItems.length === 0 ? (
              <Card className="border border-border p-6">
                <div className="text-[18px] font-medium">No matching papercuts</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </div>
              </Card>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>

      <PapercutFocusDialog
        open={open}
        onOpenChange={setOpen}
        initialScreenshotUrl={prefillScreenshotUrl}
        onCreated={() => refresh()}
      />
    </div>
  );
}


