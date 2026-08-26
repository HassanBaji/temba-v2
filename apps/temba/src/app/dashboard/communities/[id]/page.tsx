"use client";

import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";

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
  const utils = api.useUtils();
  const community = api.communities.byId.useQuery({ id });

  const joinRequests = api.communities.listJoinRequests.useQuery(
    { communityId: id },
    { enabled: Boolean(community.data?.canManageJoinRequests) },
  );

  const requestJoin = api.communities.requestJoin.useMutation({
    onSuccess: async () => {
      toast.success("Join request sent");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.directory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approveJoinRequest = api.communities.approveJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success("Request approved");
      await utils.communities.listJoinRequests.invalidate({ communityId: id });
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectJoinRequest = api.communities.rejectJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success("Request rejected");
      await utils.communities.listJoinRequests.invalidate({ communityId: id });
      await utils.communities.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPublic = community.data?.type === "public";
  const isLive = !community.data?.archivedAt;
  const isMember = Boolean(community.data?.membership);
  const joinStatus = community.data?.joinRequest?.status;
  const canRequestJoin =
    isPublic && isLive && !isMember && joinStatus !== "pending";

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
                  {!community.data.membership && joinStatus === "pending" ? (
                    <span>· Join request pending</span>
                  ) : null}
                  {!community.data.membership && joinStatus === "rejected" ? (
                    <span>· Join request rejected</span>
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
            {canRequestJoin ? (
              <Button
                onClick={() => requestJoin.mutate({ communityId: id })}
                disabled={requestJoin.isPending}
              >
                {joinStatus === "rejected"
                  ? requestJoin.isPending
                    ? "Requesting…"
                    : "Request again"
                  : requestJoin.isPending
                    ? "Requesting…"
                    : "Request to join"}
              </Button>
            ) : null}
            {isPublic && isLive && !isMember && joinStatus === "pending" ? (
              <Button variant="secondary" disabled>
                Request pending
              </Button>
            ) : null}
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

        {community.data?.canManageJoinRequests ? (
          <section className="rounded-xl border border-white/10 bg-black/20 p-6">
            <h3 className="text-lg font-medium text-white">Join requests</h3>
            <p className="mt-2 text-sm text-white/70">
              Approve to admit as Member, reject to refuse (they may
              re-request), or leave pending to ignore.
            </p>

            {joinRequests.isLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : null}

            {joinRequests.error ? (
              <p className="mt-4 text-sm text-red-300">
                {joinRequests.error.message}
              </p>
            ) : null}

            {joinRequests.data?.length === 0 ? (
              <p className="mt-4 text-sm text-white/60">No pending requests.</p>
            ) : null}

            {joinRequests.data && joinRequests.data.length > 0 ? (
              <ul className="mt-4 divide-y divide-white/10 rounded-lg border border-white/10">
                {joinRequests.data.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {request.user.name}
                      </p>
                      <p className="text-sm text-white/60">
                        {request.user.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          approveJoinRequest.mutate({ requestId: request.id })
                        }
                        disabled={
                          approveJoinRequest.isPending ||
                          rejectJoinRequest.isPending
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          rejectJoinRequest.mutate({ requestId: request.id })
                        }
                        disabled={
                          approveJoinRequest.isPending ||
                          rejectJoinRequest.isPending
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {community.data?.type === "public" ? (
          <p className="text-xs text-white/50">
            Community Public uses request-to-join only. There is no Email invite
            or Invite link.
          </p>
        ) : null}
      </div>
    </DashboardShell>
  );
}
