"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function DirectoryPage() {
  const directory = api.communities.directory.useQuery();

  return (
    <DashboardShell title="Directory">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Directory
            </h2>
            <p className="text-sm text-white/70">
              Live Community Public clubs only. Private clubs and Groups are not
              listed.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/communities/new">Create Community</Link>
          </Button>
        </div>

        {directory.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {directory.error ? (
          <p className="text-sm text-red-300">{directory.error.message}</p>
        ) : null}

        {directory.data?.length === 0 ? (
          <p className="text-sm text-white/70">
            No live public Communities yet. Create one to see it here.
          </p>
        ) : null}

        {directory.data && directory.data.length > 0 ? (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
            {directory.data.map((community) => (
              <li key={community.id}>
                <Link
                  href={`/dashboard/communities/${community.id}`}
                  className="flex flex-col gap-2 px-4 py-4 transition hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-white">{community.name}</p>
                    {community.description ? (
                      <p className="text-sm text-white/60">
                        {community.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {community.sports.map((sport) => (
                      <Badge key={sport} variant="secondary">
                        {sport}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardShell>
  );
}
