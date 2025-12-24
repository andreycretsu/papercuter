"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import type { Papercut, PapercutStatus } from "@/server/papercuts-supabase-store";
import { PAPERCUT_MODULES } from "@/server/papercuts-supabase-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Input } from "@/components/ui/input";
import { PapercutFocusDialog } from "@/components/papercut-focus-dialog";
import { Snowfall } from "@/components/snowfall";
import { RotateCcw } from "lucide-react";
import { LikeButton } from "@/components/like-button";
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
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

type TopPerformer = {
  email: string;
  count: number;
  modules: string[];
};

type Tab = "dashboard" | "papercuts";

export function MainLayout(props: {
  initialPapercuts: Papercut[];
  initialError?: string | null;
  userRole: string;
  initialTab?: Tab;
}) {
  const [activeTab, setActiveTab] = React.useState<Tab>(props.initialTab || "dashboard");
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

  // Keyboard shortcut for creating new papercut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an editable element
      const target = e.target as HTMLElement;
      const isEditableElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;

      if (
        e.key === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isEditableElement
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Calculate top performers
  const topPerformers = React.useMemo(() => {
    const userStats = new Map<string, { count: number; modules: Set<string> }>();

    items.forEach((p) => {
      if (p.userEmail) {
        const stats = userStats.get(p.userEmail) || {
          count: 0,
          modules: new Set<string>(),
        };
        stats.count++;
        if (p.module) stats.modules.add(p.module);
        userStats.set(p.userEmail, stats);
      }
    });

    return Array.from(userStats.entries())
      .map(([email, stats]) => ({
        email,
        count: stats.count,
        modules: Array.from(stats.modules),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [items]);

  // Module statistics
  const moduleStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    items.forEach((p) => {
      if (p.module) {
        stats.set(p.module, (stats.get(p.module) || 0) + 1);
      }
    });
    return Array.from(stats.entries())
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

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
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((p) => p.id)));
    }
  };

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

      await Promise.all(updatePromises);
      toast.success(`Updated ${selectedIds.size} papercut${selectedIds.size > 1 ? 's' : ''}`);
      await refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filtered papercuts
  const filteredItems = React.useMemo(() => {
    return items.filter((p) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(query) &&
          !p.descriptionHtml?.toLowerCase().includes(query)
        ) {
          return false;
        }
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

  const uniqueEmails = React.useMemo(() => {
    return Array.from(new Set(items.map((p) => p.userEmail).filter(Boolean)));
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <Snowfall />

      {/* Sticky header with tabs */}
      <div className="sticky top-0 z-10 bg-background border-b border-border w-full">
        <div className="mx-auto w-full px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-semibold leading-tight">Papercuts</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Capture a screenshot, add a short description, and turn it into action later.
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b-2 border-transparent">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === "dashboard"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dashboard
                  {activeTab === "dashboard" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("papercuts")}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === "papercuts"
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Papercuts
                  {activeTab === "papercuts" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
              <Button onClick={() => setOpen(true)} className="h-10 gap-2">
                New papercut
                <Kbd>N</Kbd>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full max-w-6xl px-6 pb-6">
        {props.initialError ? (
          <Card className="border border-border p-4 mb-6">
            <div className="text-[18px] font-semibold">Setup needed</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {props.initialError}
            </div>
          </Card>
        ) : null}

        {/* Dashboard View */}
        {activeTab === "dashboard" && (
          <div className="py-8">
            {/* Stats overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border border-border p-6">
                <div className="text-sm font-medium text-muted-foreground">Total Papercuts</div>
                <div className="text-3xl font-bold mt-2">{items.length}</div>
              </Card>
              <Card className="border border-border p-6">
                <div className="text-sm font-medium text-muted-foreground">Contributors</div>
                <div className="text-3xl font-bold mt-2">
                  {new Set(items.filter((p) => p.userEmail).map((p) => p.userEmail)).size}
                </div>
              </Card>
              <Card className="border border-border p-6">
                <div className="text-sm font-medium text-muted-foreground">Modules</div>
                <div className="text-3xl font-bold mt-2">{moduleStats.length}</div>
              </Card>
            </div>

            {/* Top performers */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Top Contributors</h2>
              {topPerformers.length === 0 ? (
                <Card className="border border-border p-6">
                  <div className="text-sm text-muted-foreground">No papercuts yet</div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topPerformers.map((performer, index) => (
                    <Card
                      key={performer.email}
                      className="border border-border p-6 relative overflow-hidden"
                    >
                      {index === 0 && (
                        <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                          #1
                        </div>
                      )}
                      <div className="text-sm font-medium">{performer.email}</div>
                      <div className="text-2xl font-bold mt-2">{performer.count} papercuts</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {performer.modules.join(", ")}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Module breakdown */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Papercuts by Module</h2>
              {moduleStats.length === 0 ? (
                <Card className="border border-border p-6">
                  <div className="text-sm text-muted-foreground">No modules yet</div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moduleStats.map((stat) => (
                    <Card key={stat.module} className="border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{stat.module}</span>
                        <span className="text-2xl font-bold">{stat.count}</span>
                      </div>
                      <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{
                            width: `${(stat.count / items.length) * 100}%`,
                          }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Papercuts List View */}
        {activeTab === "papercuts" && items.length === 0 ? (
          <Card className="border border-border p-6">
            <div className="text-[18px] font-medium">No papercuts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Click "New papercut" to create one. You can also create from the extension later.
            </div>
          </Card>
        ) : activeTab === "papercuts" ? (
          <>
            {/* Sticky search and filters */}
            <div className="sticky top-[86px] z-10 bg-background pt-4 pb-4 mb-4 border-b border-border w-full -mx-6 px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Segmented Status Filter */}
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      statusFilter === 'all'
                        ? 'bg-white text-foreground shadow'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('open')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      statusFilter === 'open'
                        ? 'bg-white text-foreground shadow'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setStatusFilter('resolved')}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      statusFilter === 'resolved'
                        ? 'bg-white text-foreground shadow'
                        : 'hover:bg-white/50'
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
                      size="icon"
                      onClick={resetFilters}
                      className="h-9 w-9"
                      aria-label="Clear filters"
                    >
                      <RotateCcw className="h-4 w-4" />
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
                    <div key={p.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelection(p.id);
                        }}
                        className="h-4 w-4 rounded border-border flex-shrink-0"
                      />
                      <Card className="border border-border p-4 hover:bg-accent transition-colors flex-1">
                        <Link href={`/papercuts/${p.id}`} className="block">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-[18px] font-semibold">
                                  {p.name}
                                </div>
                                {p.module && (
                                  <span className="shrink-0 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                    {p.module}
                                  </span>
                                )}
                                {p.type && (
                                  <span className="shrink-0 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                    {p.type}
                                  </span>
                                )}
                              </div>
                              {p.descriptionHtml && (
                                <div
                                  className="mt-1 text-sm text-muted-foreground line-clamp-2"
                                  dangerouslySetInnerHTML={{
                                    __html: p.descriptionHtml,
                                  }}
                                />
                              )}
                              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                                {p.userEmail && <span>{p.userEmail}</span>}
                                <span
                                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                    p.status === "open"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                            </div>
                            {p.screenshotUrl ? (
                              <div className="shrink-0 w-[280px] h-[160px] rounded-md overflow-hidden bg-gray-100">
                                <Image
                                  src={p.screenshotUrl}
                                  alt={p.name}
                                  width={280}
                                  height={160}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      </Card>
                      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                        <LikeButton
                          papercutId={p.id}
                          initialLikeCount={p.likeCount || 0}
                          initialUserLikeCount={p.userLikeCount || 0}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <Card className="border border-border shadow-lg">
                  <div className="flex items-center gap-4 px-6 py-4">
                    <span className="text-sm font-medium">
                      {selectedIds.size} selected
                    </span>
                    <Separator orientation="vertical" className="h-6" />
                    {props.userRole === "admin" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bulkUpdateStatus("open")}
                          disabled={isUpdatingStatus}
                        >
                          Mark as Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => bulkUpdateStatus("resolved")}
                          disabled={isUpdatingStatus}
                        >
                          Mark as Resolved
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteClick}
                          disabled={isDeleting}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        ) : null}
      </div>

      <PapercutFocusDialog
        open={open}
        onOpenChange={setOpen}
        initialScreenshotUrl={prefillScreenshotUrl}
        onCreated={() => {
          setPrefillScreenshotUrl(null);
          refresh();
        }}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} papercut{selectedIds.size > 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
