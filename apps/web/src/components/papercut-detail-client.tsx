"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LikeButton } from "@/components/like-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SwipeToResolve } from "@/components/swipe-to-resolve";

type PapercutModule = 'CoreHR' | 'Recruit' | 'Perform' | 'Pulse' | 'Time' | 'Desk' | 'Interface';
type PapercutStatus = 'open' | 'resolved';
type PapercutType = 'UXUI' | 'Feature Idea';

type Papercut = {
  id: string;
  name: string;
  descriptionHtml: string;
  screenshotUrl?: string | null;
  createdAt: string;
  userEmail?: string | null;
  module?: PapercutModule | null;
  status: PapercutStatus;
  type: PapercutType;
  likeCount?: number;
  userLikeCount?: number;
};

type PapercutActivity = {
  id: string;
  papercutId: string;
  userEmail: string;
  action: 'created' | 'edited' | 'resolved' | 'reopened';
  createdAt: string;
};

export function PapercutDetailClient({
  papercut,
  initialActivity = [],
  currentUserEmail
}: {
  papercut: Papercut;
  initialActivity?: PapercutActivity[];
  currentUserEmail?: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState<PapercutStatus>(papercut.status);
  const [isCreatingJiraIssue, setIsCreatingJiraIssue] = React.useState(false);
  const [showJiraDialog, setShowJiraDialog] = React.useState(false);
  const [jiraProjects, setJiraProjects] = React.useState<Array<{key: string, name: string}>>([]);
  const [selectedProject, setSelectedProject] = React.useState<string>("");
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(false);
  const [activity, setActivity] = React.useState<PapercutActivity[]>(initialActivity);

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
        body: JSON.stringify({
          status: newStatus,
          userEmail: currentUserEmail || "Unknown"
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      setCurrentStatus(newStatus);
      toast.success(newStatus === 'resolved' ? "Papercut resolved" : "Papercut reopened");

      // Refresh activity data
      const activityRes = await fetch(`/api/papercuts/${papercut.id}/activity`);
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }

      router.refresh();
    } catch {
      toast.error("Couldn't update papercut status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const fetchJiraProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch('/api/jira/projects');
      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await res.json();
      setJiraProjects(data.projects || []);
      if (data.projects?.length > 0) {
        setSelectedProject(data.projects[0].key);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Jira projects');
      setShowJiraDialog(false);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleOpenJiraDialog = () => {
    setShowJiraDialog(true);
    fetchJiraProjects();
  };

  const handleCreateJiraIssue = async () => {
    if (isCreatingJiraIssue || !selectedProject) return;

    setIsCreatingJiraIssue(true);
    try {
      // Strip HTML tags from description for plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = papercut.descriptionHtml;
      const description = tempDiv.textContent || tempDiv.innerText || '';

      const res = await fetch('/api/jira/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          papercutId: papercut.id,
          name: papercut.name,
          description,
          screenshotUrl: papercut.screenshotUrl,
          module: papercut.module,
          type: papercut.type,
          projectKey: selectedProject
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Jira issue');
      }

      toast.success(`Jira issue created: ${data.issueKey}`, {
        description: 'Click to open in Jira',
        action: {
          label: 'Open',
          onClick: () => window.open(data.issueUrl, '_blank')
        }
      });
      setShowJiraDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create Jira issue');
    } finally {
      setIsCreatingJiraIssue(false);
    }
  };

  // Activity timeline from real database activity log
  const activityTimeline = React.useMemo(() => {
    return activity.map(event => ({
      id: event.id,
      action: event.action,
      user: event.userEmail,
      timestamp: event.createdAt,
    }));
  }, [activity]);

  return (
    <div className="flex gap-6 justify-center">
      {/* Main Content - Centered */}
      <div className="flex-1 max-w-3xl">
        <Card className="border border-border p-8 mb-32">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {papercut.name}
              </h1>
              <span className={`inline-flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium ring-1 ring-inset ${
                papercut.type === 'UXUI'
                  ? 'bg-purple-50 text-purple-700 ring-purple-700/10'
                  : 'bg-indigo-50 text-indigo-700 ring-indigo-700/10'
              }`}>
                {papercut.type}
              </span>
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
            <div className="mt-3">
              <LikeButton
                papercutId={papercut.id}
                initialLikeCount={papercut.likeCount || 0}
                initialUserLikeCount={papercut.userLikeCount || 0}
              />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/papercuts/${papercut.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleOpenJiraDialog}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Create Jira Issue
                  </DropdownMenuItem>
                  {currentStatus === 'resolved' && (
                    <DropdownMenuItem
                      onClick={handleResolve}
                      disabled={isUpdatingStatus}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isUpdatingStatus ? "Reopening..." : "Reopen"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="border-t border-border my-6"></div>

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

      {currentStatus === 'open' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className="bg-white rounded-xl border border-border shadow-lg p-4">
            <SwipeToResolve
              onResolve={handleResolve}
              isResolving={isUpdatingStatus}
              isResolved={false}
            />
          </div>
        </div>
      )}

      <Dialog open={showJiraDialog} onOpenChange={setShowJiraDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Jira Issue</DialogTitle>
            <DialogDescription>
              Select a Jira project to create this papercut as an issue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project">Jira Project</Label>
              {isLoadingProjects ? (
                <div className="text-sm text-muted-foreground">Loading projects...</div>
              ) : jiraProjects.length === 0 ? (
                <div className="text-sm text-muted-foreground">No projects found</div>
              ) : (
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {jiraProjects.map((project) => (
                      <SelectItem key={project.key} value={project.key}>
                        {project.name} ({project.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Issue will include:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>Summary: {papercut.name}</li>
                <li>Reporter: {papercut.userEmail || 'Unknown'}</li>
                {papercut.module && <li>Module: {papercut.module}</li>}
                {papercut.type && <li>Type: {papercut.type}</li>}
                {papercut.screenshotUrl && <li>Screenshot attachment</li>}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowJiraDialog(false)}
              disabled={isCreatingJiraIssue}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateJiraIssue}
              disabled={isCreatingJiraIssue || !selectedProject || isLoadingProjects}
            >
              {isCreatingJiraIssue ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Card>
      </div>

      {/* Activity Timeline - Right Side */}
      <div className="w-64 shrink-0">
        <div className="sticky top-24">
          <h3 className="text-sm font-semibold text-foreground mb-4">Activity</h3>
          <div className="space-y-4">
            {activityTimeline.map((event, index) => {
              const actionColor = event.action === 'resolved' ? 'bg-green-600' :
                                 event.action === 'reopened' ? 'bg-yellow-600' :
                                 event.action === 'edited' ? 'bg-purple-600' :
                                 'bg-blue-600';

              const actionText = event.action === 'created' ? 'created papercut' :
                                event.action === 'resolved' ? 'resolved papercut' :
                                event.action === 'reopened' ? 'reopened papercut' :
                                event.action === 'edited' ? 'edited papercut' :
                                event.action;

              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${actionColor}`} />
                    {index < activityTimeline.length - 1 && (
                      <div className="w-0.5 h-full min-h-[40px] bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="text-sm text-foreground">
                      <span className="font-medium">{event.user}</span>
                      {' '}
                      <span className="text-muted-foreground">
                        {actionText}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
