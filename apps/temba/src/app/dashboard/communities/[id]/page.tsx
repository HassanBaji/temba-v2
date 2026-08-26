"use client";

import Link from "next/link";
import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function CommunityHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const community = api.communities.byId.useQuery({ id });

  return (
    <DashboardShell title={community.data?.name ?? "Community"}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {community.isLoading ? (
              <>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : null}

            {community.error ? (
              <p className="text-sm text-red-300">{community.error.message}</p>
            ) : null}

            {community.data ? (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {community.data.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span className="capitalize">{community.data.type}</span>
                  {community.data.membership ? (
                    <span>· Your role: {community.data.membership.role}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {community.data.sports.map((sport) => (
                    <Badge key={sport} variant="secondary">
                      {sport}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/communities">My Communities</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/directory">Directory</Link>
            </Button>
          </div>
        </div>

        {community.data ? (
          <section className="rounded-xl border border-white/10 bg-black/20 p-6">
            <h3 className="text-lg font-medium text-white">Groups</h3>
            <p className="mt-2 text-sm text-white/70">
              This Community has no Groups yet. You can return here anytime from
              My Communities.
            </p>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
