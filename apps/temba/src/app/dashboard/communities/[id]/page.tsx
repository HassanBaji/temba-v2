"use client";

import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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

  const emailInvites = api.communities.listEmailInvites.useQuery(
    { communityId: id },
    { enabled: Boolean(community.data?.canManageInvites) },
  );
  const inviteLink = api.communities.getInviteLink.useQuery(
    { communityId: id },
    { enabled: Boolean(community.data?.canManageInvites) },
  );

  const sendEmailInvite = api.communities.sendEmailInvite.useMutation({
    onSuccess: async (result) => {
      toast.success(`Email invite ready for ${result.email}`);
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite URL copied");
      await utils.communities.listEmailInvites.invalidate({ communityId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const revokeEmailInvite = api.communities.revokeEmailInvite.useMutation({
    onSuccess: async () => {
      toast.success("Email invite revoked");
      await utils.communities.listEmailInvites.invalidate({ communityId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const createInviteLink = api.communities.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied");
      await utils.communities.getInviteLink.invalidate({ communityId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const rotateInviteLink = api.communities.rotateInviteLink.useMutation({
    onSuccess: async (result) => {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link rotated and copied");
      await utils.communities.getInviteLink.invalidate({ communityId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const revokeInviteLink = api.communities.revokeInviteLink.useMutation({
    onSuccess: async () => {
      toast.success("Invite link revoked");
      await utils.communities.getInviteLink.invalidate({ communityId: id });
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

        {community.data?.canManageInvites ? (
          <section className="space-y-6 rounded-xl border border-white/10 bg-black/20 p-6">
            <div>
              <h3 className="text-lg font-medium text-white">Private invites</h3>
              <p className="mt-2 text-sm text-white/70">
                Owner and Admin can send Email invites and manage one reusable
                Invite link.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              <h4 className="font-medium text-white">Email invite</h4>
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const emailValue = formData.get("email");
                  if (typeof emailValue !== "string") {
                    return;
                  }
                  const email = emailValue.trim();
                  if (!email) {
                    return;
                  }
                  sendEmailInvite.mutate({ communityId: id, email });
                  event.currentTarget.reset();
                }}
              >
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="invitee@email.com"
                  className="flex-1"
                />
                <Button type="submit" disabled={sendEmailInvite.isPending}>
                  {sendEmailInvite.isPending ? "Sending…" : "Send invite"}
                </Button>
              </form>

              {emailInvites.data?.length === 0 ? (
                <p className="text-sm text-white/60">No unused Email invites.</p>
              ) : null}
              {emailInvites.data && emailInvites.data.length > 0 ? (
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                  {emailInvites.data.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{invite.email}</p>
                        <p className="text-xs text-white/60">
                          {invite.attachedUserId
                            ? "Attached to existing User"
                            : "No User yet"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await navigator.clipboard.writeText(invite.inviteUrl);
                            toast.success("Email invite URL copied");
                          }}
                        >
                          Copy URL
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            revokeEmailInvite.mutate({ inviteId: invite.id })
                          }
                          disabled={revokeEmailInvite.isPending}
                        >
                          Revoke
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 p-4">
              <h4 className="font-medium text-white">Invite link</h4>
              {inviteLink.data ? (
                <>
                  <p className="text-sm text-white/70">
                    Live reusable link. Any authenticated User who opens it
                    becomes a Member.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          inviteLink.data!.inviteUrl,
                        );
                        toast.success("Invite link copied");
                      }}
                    >
                      Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rotateInviteLink.mutate({ communityId: id })}
                      disabled={rotateInviteLink.isPending}
                    >
                      Rotate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeInviteLink.mutate({ communityId: id })}
                      disabled={revokeInviteLink.isPending}
                    >
                      Revoke
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-white/70">No active Invite link.</p>
                  <Button
                    size="sm"
                    onClick={() => createInviteLink.mutate({ communityId: id })}
                    disabled={createInviteLink.isPending}
                  >
                    {createInviteLink.isPending ? "Creating…" : "Create link"}
                  </Button>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
