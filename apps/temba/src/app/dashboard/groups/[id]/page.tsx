"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

function formatGameStart(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GroupHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = api.useUtils();
  const group = api.groups.byId.useQuery({ id });

  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );

  const inviteLink = api.groups.getInviteLink.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageInviteLinks) },
  );

  const joinClubPublic = api.groups.joinClubPublic.useMutation({
    onSuccess: async () => {
      toast.success("Joined Group");
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
      if (group.data?.communityId) {
        await utils.communities.byId.invalidate({
          id: group.data.communityId,
        });
        await utils.communities.mine.invalidate();
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
      await utils.groups.mine.invalidate();
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
      await utils.groups.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteGroup = api.groups.delete.useMutation({
    onSuccess: async (result) => {
      toast.success("Group deleted");
      await utils.groups.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
        router.push(`/dashboard/communities/${result.communityId}`);
        return;
      }
      router.push("/dashboard/groups");
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

  const sendLookupInvite = api.groups.sendLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite sent");
      await utils.groups.listLookupInvites.invalidate({ groupId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeLookupInvite = api.groups.revokeLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite revoked");
      await utils.groups.listLookupInvites.invalidate({ groupId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinPending = joinClubPublic.isPending || joinLoosePublic.isPending;

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
              <p className="text-destructive text-sm">{group.error.message}</p>
            ) : null}

            {group.data ? (
              <>
                <h2 className="text-foreground text-2xl font-semibold tracking-tight">
                  {group.data.name ?? "Untitled Group"}
                </h2>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span className="capitalize">{group.data.type}</span>
                  {group.data.sport ? <span>· {group.data.sport}</span> : null}
                  {group.data.isLoose ? (
                    <span>· Group outside a Community</span>
                  ) : (
                    <span>· Club Group</span>
                  )}
                  {group.data.isCommunityArchived ? (
                    <span>· Community Soft-archived</span>
                  ) : null}
                  {group.data.membership ? (
                    <span>· You are a member</span>
                  ) : null}
                  {!group.data.communityMembership &&
                  group.data.communityId &&
                  !group.data.isCommunityArchived ? (
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
                      <Badge variant="outline">Outside a Community</Badge>
                    ) : null}
                    {group.data.isCommunityArchived ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                  </div>
                ) : null}
                {group.data.community ? (
                  <p className="text-muted-foreground text-sm">
                    Club Group in{" "}
                    <Link
                      href={`/dashboard/communities/${group.data.community.id}`}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      {group.data.community.name}
                    </Link>
                  </p>
                ) : null}
                {group.data.isLoose && group.data.type === "public" ? (
                  <p className="text-muted-foreground text-sm">
                    Open-with-link: share the Group URL. The creator can also
                    send a Lookup invite or copy an Invite link.
                  </p>
                ) : null}
                {group.data.isLoose && group.data.type === "private" ? (
                  <p className="text-muted-foreground text-sm">
                    Private: Lookup invite and Invite link from the creator.
                  </p>
                ) : null}
                {!group.data.isLoose && group.data.type === "public" ? (
                  <p className="text-muted-foreground text-sm">
                    Club Group Public: Community Members can join. Owner or
                    Admin can also send a Lookup invite or copy an Invite link.
                    The Group creator may Lookup existing Members only.
                  </p>
                ) : null}
                {!group.data.isLoose && group.data.type === "private" ? (
                  <p className="text-muted-foreground text-sm">
                    Club Group Private: Owner or Admin can Lookup-invite any
                    User or copy an Invite link (auto-admits as Member then
                    joins). The Group creator may Lookup existing Members only
                    and cannot mint Invite links.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {group.data?.canCreateGame ? (
              <Button asChild>
                <Link href={`/dashboard/games/new?groupId=${id}`}>
                  Create Game
                </Link>
              </Button>
            ) : null}
            {group.data?.canJoin ? (
              <Button onClick={onJoin} disabled={joinPending}>
                {joinPending ? "Joining…" : "Join Group"}
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
            {group.data?.canDelete ? (
              <Button
                variant="outline"
                onClick={() => deleteGroup.mutate({ groupId: id })}
                disabled={deleteGroup.isPending}
              >
                {deleteGroup.isPending ? "Deleting…" : "Delete Group"}
              </Button>
            ) : null}
            {group.data?.isLoose && group.data.type === "public" ? (
              <Button variant="outline" onClick={copyGroupUrl}>
                Copy Group URL
              </Button>
            ) : null}
            {group.data?.communityId ? (
              <>
                <Button variant="outline" asChild>
                  <Link
                    href={`/dashboard/communities/${group.data.communityId}`}
                  >
                    Community
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/communities">Communities</Link>
                </Button>
              </>
            ) : group.data ? (
              <Button variant="outline" asChild>
                <Link href="/dashboard/groups">Groups</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {group.data?.isCommunityArchived && !group.data.communityMembership ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-foreground text-lg font-medium">
              This Club Group&apos;s Community is Soft-archived
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              It is not open for join. Members of the Community can still open
              history and Games. This is not a missing page.
            </p>
          </section>
        ) : null}

        {group.data?.isCommunityArchived && group.data.communityMembership ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-foreground text-lg font-medium">
              Community Soft-archived
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              This Club Group stays attached to its Community. You can still
              open it and see history and Games while the Community is archived.
            </p>
          </section>
        ) : null}

        {group.data?.communityId &&
        !group.data.communityMembership &&
        !group.data.isCommunityArchived ? (
          <p className="text-muted-foreground text-sm">
            You cannot join this Club Group until you are a member of its
            Community.
          </p>
        ) : null}

        {group.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Group stats
            </h3>
            <p className="text-muted-foreground text-sm">
              Stored counters for this Group.
            </p>
            <dl className="border-border bg-card rounded-xl border">
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Games played</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {group.data.totalGamesPlayed}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        {group.data?.membership ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Your standing
            </h3>
            <p className="text-muted-foreground text-sm">
              Your membership counters and position on this Group&apos;s
              leaderboard (by sets won).
            </p>
            <dl className="border-border bg-card grid grid-cols-1 divide-y rounded-xl border md:grid-cols-4 md:divide-x md:divide-y-0">
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Position</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {group.data.membership.standingPosition != null
                    ? `#${group.data.membership.standingPosition}`
                    : "—"}
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    of {group.data.standing.memberCount}
                  </span>
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Sets won</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {group.data.membership.totalSetsWon}
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Points won</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {group.data.membership.totalPointsWon}
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Games played</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {group.data.membership.totalGamesPlayed}
                </dd>
              </div>
            </dl>
          </section>
        ) : group.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Your standing
            </h3>
            <div className="border-border bg-card rounded-xl border px-4 py-6">
              <p className="text-muted-foreground text-sm">
                You are not a member of this Group, so you do not have a
                standing position here. Join to appear on the leaderboard.
              </p>
            </div>
          </section>
        ) : null}

        {group.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Standing leaderboard
            </h3>
            <p className="text-muted-foreground text-sm">
              Members ordered by sets won, then points won, then Games played,
              then name.
            </p>

            {group.data.standing.leaderboard.length === 0 ? (
              <div className="border-border bg-card rounded-xl border px-4 py-6">
                <p className="text-muted-foreground text-sm">
                  No members yet. When people join this Group, their standing
                  will show here with sets, points, and Games at zero until they
                  play.
                </p>
              </div>
            ) : (
              <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                {group.data.standing.leaderboard.map((entry) => (
                  <li
                    key={entry.userId}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">
                        <span className="text-muted-foreground mr-2 tabular-nums">
                          #{entry.position}
                        </span>
                        {entry.name}
                        {entry.isViewer ? (
                          <span className="text-muted-foreground ml-2 text-sm font-normal">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {entry.totalSetsWon} sets · {entry.totalPointsWon}{" "}
                        points · {entry.totalGamesPlayed} Games
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {group.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Upcoming Games
            </h3>
            <p className="text-muted-foreground text-sm">
              Upcoming Games for this Group, soonest first.
            </p>

            {group.data.upcomingGames.length === 0 ? (
              <div className="border-border bg-card rounded-xl border px-4 py-6">
                <p className="text-muted-foreground text-sm">
                  No upcoming Games scheduled for this Group. When a Game is set
                  with a live window or Match, it will show up here.
                </p>
              </div>
            ) : (
              <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                {group.data.upcomingGames.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/dashboard/games/${game.id}`}
                      className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          {game.name ?? "Untitled Game"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {formatGameStart(game.startTime)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {game.sport ? (
                          <Badge variant="secondary" className="capitalize">
                            {game.sport}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="capitalize">
                          {game.format.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {group.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Game history
            </h3>
            <p className="text-muted-foreground text-sm">
              Past or cancelled Games for this Group, newest first.
            </p>

            {group.data.gameHistory.length === 0 ? (
              <div className="border-border bg-card rounded-xl border px-4 py-6">
                <p className="text-muted-foreground text-sm">
                  No Game history yet. Finished, cancelled, or past-window Games
                  for this Group will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                {group.data.gameHistory.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/dashboard/games/${game.id}`}
                      className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          {game.name ?? "Untitled Game"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {formatGameStart(game.startTime)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {game.sport ? (
                          <Badge variant="secondary" className="capitalize">
                            {game.sport}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="capitalize">
                          {game.cancelledAt
                            ? "cancelled"
                            : game.format.replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {group.data?.canManageLookupInvites ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Lookup invite
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {group.data.isLoose
                  ? "Only you can look up an existing User by username, email, or phone. The invitee accepts on Invites. Lookup invites do not expire."
                  : "Owner or Admin can look up any existing User. Accept auto-admits them as Community Member then joins this Group. The Group creator may Lookup existing Members only. Invitees accept on Invites."}
              </p>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const queryValue = formData.get("query");
                if (typeof queryValue !== "string") {
                  return;
                }
                const query = queryValue.trim();
                if (!query) {
                  return;
                }
                sendLookupInvite.mutate({ groupId: id, query });
                event.currentTarget.reset();
              }}
            >
              <Input
                name="query"
                type="text"
                required
                placeholder="Username, email, or phone"
                className="flex-1"
              />
              <Button type="submit" disabled={sendLookupInvite.isPending}>
                {sendLookupInvite.isPending ? "Sending…" : "Send Lookup invite"}
              </Button>
            </form>

            {lookupInvites.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No unused Lookup invites.
              </p>
            ) : null}
            {lookupInvites.data && lookupInvites.data.length > 0 ? (
              <ul className="divide-border border-border divide-y rounded-lg border">
                {lookupInvites.data.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-foreground font-medium">
                        {invite.user.name}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {invite.user.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        revokeLookupInvite.mutate({ inviteId: invite.id })
                      }
                      disabled={revokeLookupInvite.isPending}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {group.data?.canManageInviteLinks ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Invite link
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Each copy mints a new 6-hour token. Older copied URLs stay live
                until each expires. There is no rotate or revoke. Distinct from
                the Group URL.
              </p>
            </div>
            {inviteLink.data ? (
              <p className="text-muted-foreground break-all text-sm">
                Newest: {inviteLink.data.inviteUrl}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No live Invite link. Copy to mint one.
              </p>
            )}
            <Button
              size="sm"
              onClick={() => createInviteLink.mutate({ groupId: id })}
              disabled={createInviteLink.isPending}
            >
              {createInviteLink.isPending ? "Copying…" : "Copy Invite link"}
            </Button>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
