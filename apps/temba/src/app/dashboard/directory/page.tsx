"use client";

import Link from "next/link";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function DirectoryPage() {
  const utils = api.useUtils();
  const directory = api.communities.directory.useQuery();

  const requestJoin = api.communities.requestJoin.useMutation({
    onSuccess: async () => {
      toast.success("Join request sent");
      await utils.communities.directory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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
              listed. Request to join — no Email invite or Invite link.
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
            {directory.data.map((community) => {
              const isMember = Boolean(community.membership);
              const joinStatus = community.joinRequest?.status;
              const canRequest = !isMember && joinStatus !== "pending";

              return (
                <li
                  key={community.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/dashboard/communities/${community.id}`}
                    className="min-w-0 flex-1 space-y-1 transition hover:opacity-90"
                  >
                    <p className="font-medium text-white">{community.name}</p>
                    {community.description ? (
                      <p className="text-sm text-white/60">
                        {community.description}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {community.sports.map((sport) => (
                        <Badge key={sport} variant="secondary">
                          {sport}
                        </Badge>
                      ))}
                      {isMember ? (
                        <Badge variant="outline">
                          {community.membership?.role}
                        </Badge>
                      ) : null}
                      {!isMember && joinStatus === "pending" ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : null}
                      {!isMember && joinStatus === "rejected" ? (
                        <Badge variant="outline">Rejected</Badge>
                      ) : null}
                    </div>
                  </Link>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canRequest ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          requestJoin.mutate({ communityId: community.id })
                        }
                        disabled={requestJoin.isPending}
                      >
                        {joinStatus === "rejected" || joinStatus === "approved"
                          ? "Request again"
                          : "Request to join"}
                      </Button>
                    ) : null}
                    {!isMember && joinStatus === "pending" ? (
                      <Button size="sm" variant="secondary" disabled>
                        Pending
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/communities/${community.id}`}>
                        Open
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </DashboardShell>
  );
}
