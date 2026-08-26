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

export default function GroupHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();
  const group = api.groups.byId.useQuery({ id });

  const communityMembers = api.communities.listMembers.useQuery(
    { communityId: group.data?.communityId ?? "" },
    {
      enabled: Boolean(
        group.data?.communityId && group.data.canInviteClubPrivate,
      ),
    },
  );

  const pendingInvites = api.groups.listClubPrivateInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canInviteClubPrivate) },
  );

  const emailInvites = api.groups.listEmailInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageInvites) },
  );

  const inviteLink = api.groups.getInviteLink.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageInvites) },
  );

  const joinClubPublic = api.groups.joinClubPublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.byId.invalidate({ id });
      if (group.data?.communityId) {
        await utils.communities.byId.invalidate({
          id: group.data.communityId,
        });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinLoosePublic = api.groups.joinLoosePublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const leaveGroup = api.groups.leave.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.communityId
          ? "Left Group — you remain in the Community"
          : "Left Group",
      );
      await utils.groups.byId.invalidate({ id });
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const inviteClubPrivate = api.groups.inviteClubPrivate.useMutation({
    onSuccess: async () => {
      toast.success("Invite sent");
      await utils.groups.listClubPrivateInvites.invalidate({ groupId: id });
      await utils.groups.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeClubPrivateInvite = api.groups.revokeClubPrivateInvite.useMutation(
    {
      onSuccess: async () => {
        toast.success("Invite revoked");
        await utils.groups.listClubPrivateInvites.invalidate({ groupId: id });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const acceptClubPrivateInvite = api.groups.acceptClubPrivateInvite.useMutation(
    {
      onSuccess: async () => {
        toast.success("Joined Club Group Private");
        await utils.groups.byId.invalidate({ id });
        if (group.data?.communityId) {
          await utils.communities.byId.invalidate({
            id: group.data.communityId,
          });
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const sendEmailInvite = api.groups.sendEmailInvite.useMutation({
    onSuccess: async (result) => {
      toast.success(`Email invite ready for ${result.email}`);
      await utils.groups.listEmailInvites.invalidate({ groupId: id });
      await navigator.clipboard.writeText(result.inviteUrl);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeEmailInvite = api.groups.revokeEmailInvite.useMutation({
    onSuccess: async () => {
      toast.success("Email invite revoked");
      await utils.groups.listEmailInvites.invalidate({ groupId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createInviteLink = api.groups.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await utils.groups.getInviteLink.invalidate({ groupId: id });
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rotateInviteLink = api.groups.rotateInviteLink.useMutation({
    onSuccess: async (result) => {
      await utils.groups.getInviteLink.invalidate({ groupId: id });
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link rotated and copied");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeInviteLink = api.groups.revokeInviteLink.useMutation({
    onSuccess: async () => {
      toast.success("Invite link revoked");
      await utils.groups.getInviteLink.invalidate({ groupId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinPending =
    joinClubPublic.isPending || joinLoosePublic.isPending;

  const pendingInviteUserIds = new Set(
    pendingInvites.data?.map((invite) => invite.user.id) ?? [],
  );

  const inviteCandidates =
    communityMembers.data?.filter(
      (member) =>
        !group.data?.memberUserIds.includes(member.user.id) &&
        !pendingInviteUserIds.has(member.user.id),
    ) ?? [];

  function onJoin() {
    if (group.data?.canJoinLoosePublic) {
      joinLoosePublic.mutate({ groupId: id });
      return;
    }
    if (group.data?.canJoinClubPublic) {
      joinClubPublic.mutate({ groupId: id });
    }
  }

  async function copyGroupUrl() {
    const url = `${window.location.origin}/dashboard/groups/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Group URL copied");
  }

  return (
    <DashboardShell title={group.data?.name ?? "Group"}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {group.isLoading ? (
              <>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : null}

            {group.error ? (
              <p className="text-sm text-red-300">{group.error.message}</p>
            ) : null}

            {group.data ? (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {group.data.name ?? "Untitled Group"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span className="capitalize">{group.data.type}</span>
                  {group.data.sport ? (
                    <span>· {group.data.sport}</span>
                  ) : null}
                  {group.data.isLoose ? (
                    <span>· Loose Group</span>
                  ) : (
                    <span>· Club Group</span>
                  )}
                  {group.data.membership ? <span>· You are a member</span> : null}
                  {!group.data.communityMembership && group.data.communityId ? (
                    <span>· Not a Community member</span>
                  ) : null}
                </div>
                {group.data.sport ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{group.data.sport}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {group.data.type}
                    </Badge>
                    {group.data.isLoose ? (
                      <Badge variant="outline">Loose</Badge>
                    ) : null}
                  </div>
                ) : null}
                {group.data.community ? (
                  <p className="text-sm text-white/60">
                    Club Group in{" "}
                    <Link
                      href={`/dashboard/communities/${group.data.community.id}`}
                      className="underline underline-offset-2 hover:text-white"
                    >
                      {group.data.community.name}
                    </Link>
                  </p>
                ) : null}
                {group.data.isLoose && group.data.type === "public" ? (
                  <p className="text-sm text-white/60">
                    Open-with-link: share the Group URL. Not listed in the
                    Directory. No Invite link.
                  </p>
                ) : null}
                {group.data.isLoose && group.data.type === "private" ? (
                  <p className="text-sm text-white/60">
                    Loose Group Private: Email invite and Invite link from the
                    creator only. Not listed in the Directory.
                  </p>
                ) : null}
                {!group.data.isLoose && group.data.type === "private" ? (
                  <p className="text-sm text-white/60">
                    Club Group Private: in-app invite of Community members
                    only. No Email invite or Invite link.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {group.data?.canJoin ? (
              <Button onClick={onJoin} disabled={joinPending}>
                {joinPending ? "Joining…" : "Join Group"}
              </Button>
            ) : null}
            {group.data?.canAcceptClubPrivateInvite &&
            group.data.pendingInvite ? (
              <Button
                onClick={() =>
                  acceptClubPrivateInvite.mutate({
                    inviteId: group.data.pendingInvite!.id,
                  })
                }
                disabled={acceptClubPrivateInvite.isPending}
              >
                {acceptClubPrivateInvite.isPending
                  ? "Accepting…"
                  : "Accept invite"}
              </Button>
            ) : null}
            {group.data?.membership ? (
              <Button
                variant="outline"
                onClick={() => leaveGroup.mutate({ groupId: id })}
                disabled={leaveGroup.isPending}
              >
                {leaveGroup.isPending ? "Leaving…" : "Leave Group"}
              </Button>
            ) : null}
            {group.data?.isLoose && group.data.type === "public" ? (
              <Button variant="outline" onClick={copyGroupUrl}>
                Copy Group URL
              </Button>
            ) : null}
            {group.data?.communityId ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/communities/${group.data.communityId}`}
                >
                  Community
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/dashboard/communities">My Communities</Link>
            </Button>
          </div>
        </div>

        {group.data?.communityId && !group.data.communityMembership ? (
          <p className="text-sm text-white/60">
            You cannot join this Club Group until you are a member of its
            Community.
          </p>
        ) : null}

        {group.data?.canInviteClubPrivate ? (
          <section className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-6">
            <div>
              <h3 className="text-lg font-medium text-white">
                In-app invites
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Owner, Admin, or this Group&apos;s creator can invite existing
                Community members. Outsiders cannot be invited. There is no
                Email invite or Invite link for Club Group Private.
              </p>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const userIdValue = formData.get("userId");
                if (typeof userIdValue !== "string" || !userIdValue) {
                  return;
                }
                inviteClubPrivate.mutate({
                  groupId: id,
                  userId: userIdValue,
                });
                event.currentTarget.reset();
              }}
            >
              <select
                name="userId"
                required
                className="h-9 flex-1 rounded-md border border-white/15 bg-black/40 px-3 text-sm text-white"
                defaultValue=""
              >
                <option value="" disabled>
                  Select Community member
                </option>
                {inviteCandidates.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name} ({member.user.email})
                  </option>
                ))}
              </select>
              <Button type="submit" disabled={inviteClubPrivate.isPending}>
                {inviteClubPrivate.isPending ? "Inviting…" : "Invite"}
              </Button>
            </form>

            {pendingInvites.data?.length === 0 ? (
              <p className="text-sm text-white/60">No unused invites.</p>
            ) : null}

            {pendingInvites.data && pendingInvites.data.length > 0 ? (
              <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                {pendingInvites.data.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {invite.user.name}
                      </p>
                      <p className="text-sm text-white/60">
                        {invite.user.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        revokeClubPrivateInvite.mutate({
                          inviteId: invite.id,
                        })
                      }
                      disabled={revokeClubPrivateInvite.isPending}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {group.data?.canManageInvites ? (
          <section className="space-y-6 rounded-xl border border-white/10 bg-black/20 p-6">
            <div>
              <h3 className="text-lg font-medium text-white">Private invites</h3>
              <p className="mt-2 text-sm text-white/70">
                Only the creator can send Email invites and manage one reusable
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
                  sendEmailInvite.mutate({ groupId: id, email });
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
                            await navigator.clipboard.writeText(
                              invite.inviteUrl,
                            );
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
                    joins the Group.
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
                      onClick={() => rotateInviteLink.mutate({ groupId: id })}
                      disabled={rotateInviteLink.isPending}
                    >
                      Rotate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeInviteLink.mutate({ groupId: id })}
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
                    onClick={() => createInviteLink.mutate({ groupId: id })}
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
