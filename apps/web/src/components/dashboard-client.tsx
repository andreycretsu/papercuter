"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import type { Papercut } from "@/server/papercuts-supabase-store";
import { PAPERCUT_MODULES } from "@/server/papercuts-supabase-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TopPerformer = {
  email: string;
  count: number;
  modules: string[];
};

export function DashboardClient(props: {
  initialPapercuts: Papercut[];
  initialError?: string | null;
}) {
  const [items, setItems] = React.useState<Papercut[]>(props.initialPapercuts);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold leading-tight">Dashboard</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Overview of papercuts and team performance
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" className="h-10">
                  All papercuts
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
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {props.initialError ? (
          <Card className="border border-border p-4 mb-6">
            <div className="text-[18px] font-semibold">Setup needed</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {props.initialError}
            </div>
          </Card>
        ) : null}

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
                  {index === 1 && (
                    <div className="absolute top-0 right-0 bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      #2
                    </div>
                  )}
                  {index === 2 && (
                    <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      #3
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {performer.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{performer.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {performer.count} papercut{performer.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  {performer.modules.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {performer.modules.map((mod) => (
                        <span
                          key={mod}
                          className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  )}
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
    </div>
  );
}
