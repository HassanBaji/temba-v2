"use client";

import Link from "next/link";
import { use } from "react";
import * as React from "react";
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
    { enabled: Boolean(community.data?.canManageInviteLinks) },
  );
  const lookupInvites = api.communities.listLookupInvites.useQuery(
    { communityId: id },
    { enabled: Boolean(community.data?.canManageLookupInvites) },
  );

  const sendLookupInvite = api.communities.sendLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite sent");
      await utils.communities.listLookupInvites.invalidate({ communityId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const revokeLookupInvite = api.communities.revokeLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite revoked");
      await utils.communities.listLookupInvites.invalidate({ communityId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const teamLinkRequests = api.communities.listTeamLinkRequests.useQuery(
    { communityId: id },
    { enabled: Boolean(community.data?.canManageTeamLinks) },
  );

  const approveTeamLink = api.communities.approveTeamLink.useMutation({
    onSuccess: async () => {
      toast.success("Team linked");
      await utils.communities.listTeamLinkRequests.invalidate({
        communityId: id,
      });
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectTeamLink = api.communities.rejectTeamLink.useMutation({
    onSuccess: async () => {
      toast.success("Link request rejected");
      await utils.communities.listTeamLinkRequests.invalidate({
        communityId: id,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [venueQuery, setVenueQuery] = React.useState("");
  const liveVenues = api.communities.searchLiveVenues.useQuery(
    { communityId: id, query: venueQuery },
    { enabled: Boolean(community.data?.canRequestVenueLink) },
  );

  const requestVenueLink = api.communities.requestVenueLink.useMutation({
    onSuccess: async () => {
      toast.success("Venue link requested");
      await utils.communities.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlinkVenue = api.communities.unlinkVenue.useMutation({
    onSuccess: async () => {
      toast.success("Venue unlinked");
      await utils.communities.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createClubPublic = api.groups.createClubPublic.useMutation({
    onSuccess: async () => {
      toast.success("Club Group Public created");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createClubPrivate = api.groups.createClubPrivate.useMutation({
    onSuccess: async () => {
      toast.success("Club Group Private created");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const leaveCommunity = api.communities.leave.useMutation({
    onSuccess: async () => {
      toast.success("Left Community and its Club Groups");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const softArchive = api.communities.softArchive.useMutation({
    onSuccess: async () => {
      toast.success("Community Soft-archived");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.games.listPublicPickup.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unarchive = api.communities.unarchive.useMutation({
    onSuccess: async () => {
      toast.success("Community unarchived");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.games.listPublicPickup.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const members = api.communities.listMembers.useQuery(
    { communityId: id },
    { enabled: Boolean(community.data?.membership) },
  );

  const setMemberRole = api.communities.setMemberRole.useMutation({
    onSuccess: async (result) => {
      toast.success(`Role updated to ${result.role}`);
      await utils.communities.listMembers.invalidate({ communityId: id });
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
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
  const createClubPending =
    createClubPublic.isPending || createClubPrivate.isPending;
  const viewerUserId = community.data?.membership?.userId;
  const isLastOwnerBlockedLeave =
    community.data?.membership?.role === "owner" &&
    community.data.canLeave === false &&
    !community.data.linkedTeamBlocksLeave;
  const linkedTeamBlocksLeave = Boolean(community.data?.linkedTeamBlocksLeave);
  const archivePending = softArchive.isPending || unarchive.isPending;

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
              <p className="text-destructive text-sm">
                {community.error.message}
              </p>
            ) : null}

            {community.data ? (
              <>
                <h2 className="text-foreground text-2xl font-semibold tracking-tight">
                  {community.data.name}
                </h2>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span className="capitalize">{community.data.type}</span>
                  {!isLive ? <span>· Soft-archived</span> : null}
                  {community.data.membership ? (
                    <span>· Your role: {community.data.membership.role}</span>
                  ) : null}
                  {!community.data.membership &&
                  isLive &&
                  joinStatus === "pending" ? (
                    <span>· Join request pending</span>
                  ) : null}
                  {!community.data.membership &&
                  isLive &&
                  joinStatus === "rejected" ? (
                    <span>· Join request rejected</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {community.data.sports.map((sport) => (
                    <Badge key={sport} variant="secondary">
                      {sport}
                    </Badge>
                  ))}
                  {!isLive ? <Badge variant="outline">Archived</Badge> : null}
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
            {community.data?.canSoftArchive ? (
              <Button
                variant="outline"
                onClick={() => softArchive.mutate({ communityId: id })}
                disabled={archivePending}
              >
                {softArchive.isPending ? "Archiving…" : "Soft-archive"}
              </Button>
            ) : null}
            {community.data?.canUnarchive ? (
              <Button
                onClick={() => unarchive.mutate({ communityId: id })}
                disabled={archivePending}
              >
                {unarchive.isPending ? "Unarchiving…" : "Unarchive"}
              </Button>
            ) : null}
            {isMember ? (
              <Button
                variant="outline"
                onClick={() => leaveCommunity.mutate({ communityId: id })}
                disabled={leaveCommunity.isPending || !community.data?.canLeave}
                title={
                  linkedTeamBlocksLeave
                    ? "Unlink or dissolve the linked Team first"
                    : isLastOwnerBlockedLeave
                      ? "The last Owner cannot leave until another Owner is promoted"
                      : undefined
                }
              >
                {leaveCommunity.isPending ? "Leaving…" : "Leave Community"}
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href="/dashboard/communities">Communities</Link>
            </Button>
          </div>
        </div>

        {community.data && !isLive && !isMember ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-foreground text-lg font-medium">
              This Community is Soft-archived
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              It is not open for new joins, requests, or invites. Members can
              still open history and Games. This is not a missing page.
            </p>
          </section>
        ) : null}

        {community.data && !isLive && isMember ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-foreground text-lg font-medium">
              Soft-archived
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Club Groups stay attached. You can still open Groups and see
              history and Games. New joins, requests, Email invites, and Invite
              links are paused until an Owner or Admin unarchives.
            </p>
          </section>
        ) : null}

        {community.data?.membership ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">Venue</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Where this Community plays. Members see the linked place only.
              </p>
            </div>

            {community.data.venue ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start gap-4">
                  {community.data.venue.logoImageUrl ? (
                    // Public catalog URL (ADR-0006); not a signed URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={community.data.venue.logoImageUrl}
                      alt={`${community.data.venue.name} logo`}
                      className="border-border h-16 w-16 rounded-md border object-cover"
                    />
                  ) : null}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-foreground font-medium">
                        {community.data.venue.name}
                      </p>
                      {community.data.venue.archivedAt ? (
                        <Badge variant="outline">Venue Soft-archived</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {community.data.venue.city},{" "}
                      {community.data.venue.country}
                    </p>
                  </div>
                </div>
                {community.data.venue.courts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No Courts.</p>
                ) : (
                  <ul className="text-muted-foreground list-inside list-disc text-sm">
                    {community.data.venue.courts.map((court) => (
                      <li key={court.id}>{court.name}</li>
                    ))}
                  </ul>
                )}
                {community.data.canUnlinkVenue ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={unlinkVenue.isPending}
                    onClick={() => unlinkVenue.mutate({ communityId: id })}
                  >
                    {unlinkVenue.isPending ? "Unlinking…" : "Unlink Venue"}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                This Community is not linked to a Venue.
              </p>
            )}

            {community.data.canManageVenueLink &&
            community.data.venueLinkRequest?.status === "pending" ? (
              <p className="text-muted-foreground text-sm">
                Venue link request pending for{" "}
                {community.data.venueLinkRequest.venue.name} (
                {community.data.venueLinkRequest.venue.city},{" "}
                {community.data.venueLinkRequest.venue.country}).
              </p>
            ) : null}

            {community.data.canManageVenueLink &&
            community.data.venueLinkRequest?.status === "rejected" &&
            !community.data.venue ? (
              <p className="text-muted-foreground text-sm">
                Last Venue link request for{" "}
                {community.data.venueLinkRequest.venue.name} was rejected. You
                may request again.
              </p>
            ) : null}

            {community.data.canRequestVenueLink ? (
              <div className="space-y-3">
                <Input
                  value={venueQuery}
                  onChange={(event) => setVenueQuery(event.target.value)}
                  placeholder="Search live Venues by name, city, or country"
                />
                {liveVenues.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : null}
                {liveVenues.error ? (
                  <p className="text-destructive text-sm">
                    {liveVenues.error.message}
                  </p>
                ) : null}
                {liveVenues.data?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No live Venues match.
                  </p>
                ) : null}
                {liveVenues.data && liveVenues.data.length > 0 ? (
                  <ul className="divide-border border-border divide-y rounded-lg border">
                    {liveVenues.data.map((venue) => (
                      <li
                        key={venue.id}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-foreground font-medium">
                            {venue.name}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {venue.city}, {venue.country}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={requestVenueLink.isPending}
                          onClick={() =>
                            requestVenueLink.mutate({
                              communityId: id,
                              venueId: venue.id,
                            })
                          }
                        >
                          Request link
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {community.data ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">Groups</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Club Groups stay inside this Community. Public Groups are open
                to Community members with no extra request.
              </p>
            </div>

            {community.data.groups.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                This Community has no Groups yet.
              </p>
            ) : (
              <ul className="divide-border border-border divide-y rounded-lg border">
                {community.data.groups.map((group) => (
                  <li
                    key={group.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">
                        {group.name ?? "Untitled Group"}
                      </p>
                      <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
                        <span className="capitalize">{group.type}</span>
                        {group.sport ? <span>· {group.sport}</span> : null}
                        {group.isMember ? <span>· Joined</span> : null}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/groups/${group.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {community.data.canCreateClubGroup ? (
              <div className="space-y-4">
                <form
                  className="border-border space-y-3 rounded-lg border p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const nameValue = formData.get("name");
                    if (typeof nameValue !== "string") {
                      return;
                    }
                    const name = nameValue.trim();
                    if (!name) {
                      return;
                    }
                    createClubPublic.mutate({
                      communityId: id,
                      name,
                      sport: "padel",
                    });
                    event.currentTarget.reset();
                  }}
                >
                  <h4 className="text-foreground font-medium">
                    Create Club Group Public
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Owner or Admin only. Open to Community members. You join as
                    a Group member.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      name="name"
                      required
                      maxLength={255}
                      placeholder="Group name"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={createClubPending}>
                      {createClubPublic.isPending ? "Creating…" : "Create"}
                    </Button>
                  </div>
                </form>

                <form
                  className="border-border space-y-3 rounded-lg border p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const nameValue = formData.get("name");
                    if (typeof nameValue !== "string") {
                      return;
                    }
                    const name = nameValue.trim();
                    if (!name) {
                      return;
                    }
                    createClubPrivate.mutate({
                      communityId: id,
                      name,
                      sport: "padel",
                    });
                    event.currentTarget.reset();
                  }}
                >
                  <h4 className="text-foreground font-medium">
                    Create Club Group Private
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Owner or Admin only. Invite-only for Community members
                    (in-app). No Email invite or Invite link.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      name="name"
                      required
                      maxLength={255}
                      placeholder="Group name"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={createClubPending}>
                      {createClubPrivate.isPending ? "Creating…" : "Create"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </section>
        ) : null}

        {community.data?.membership ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">Teams</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Partnerships linked to this Community. Members can open a linked
                Team&apos;s stats.
              </p>
            </div>

            {community.data.teams.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                This Community has no linked Teams yet.
              </p>
            ) : (
              <ul className="divide-border border-border divide-y rounded-lg border">
                {community.data.teams.map((team) => (
                  <li
                    key={team.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">
                        {team.displayName}
                      </p>
                      <p className="text-muted-foreground text-sm capitalize">
                        {team.sport}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/teams/${team.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {community.data?.canManageTeamLinks ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Team link requests
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Owner or Admin approve or reject. Approve auto-admits any seat
                who is not yet a Community Member, then attaches the Team.
              </p>
            </div>

            {teamLinkRequests.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : null}

            {teamLinkRequests.error ? (
              <p className="text-destructive text-sm">
                {teamLinkRequests.error.message}
              </p>
            ) : null}

            {teamLinkRequests.data?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No pending Team link requests.
              </p>
            ) : null}

            {teamLinkRequests.data && teamLinkRequests.data.length > 0 ? (
              <ul className="divide-border border-border divide-y rounded-lg border">
                {teamLinkRequests.data.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-foreground font-medium">
                        {request.team.displayName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {request.requestedBy.name} · {request.team.sport}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          approveTeamLink.mutate({ requestId: request.id })
                        }
                        disabled={approveTeamLink.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          rejectTeamLink.mutate({ requestId: request.id })
                        }
                        disabled={rejectTeamLink.isPending}
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

        {isMember ? (
          <section className="border-border bg-card rounded-xl border p-6">
            <h3 className="text-foreground text-lg font-medium">Members</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {community.data?.canManageRoles
                ? "Owners can promote or demote members. Multiple Owners are allowed. The last Owner cannot leave or self-demote."
                : "Only Owners can change roles. Admins cannot promote, demote, or change Owner-ship."}
            </p>

            {linkedTeamBlocksLeave ? (
              <p className="mt-2 text-sm text-amber-200/90">
                Leave is refused while you sit on a Team linked to this
                Community. Unlink or dissolve the Team first.
              </p>
            ) : null}

            {isLastOwnerBlockedLeave ? (
              <p className="mt-2 text-sm text-amber-200/90">
                You are the last Owner. Promote someone else before leaving or
                demoting yourself. Leaving does not Soft-archive this Community.
              </p>
            ) : null}

            {members.isLoading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : null}

            {members.error ? (
              <p className="text-destructive mt-4 text-sm">
                {members.error.message}
              </p>
            ) : null}

            {members.data && members.data.length > 0 ? (
              <ul className="divide-border border-border mt-4 divide-y rounded-lg border">
                {members.data.map((member) => {
                  const isSelf = member.user.id === viewerUserId;
                  return (
                    <li
                      key={member.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-foreground font-medium">
                          {member.user.name}
                          {isSelf ? (
                            <span className="text-muted-foreground ml-2 text-sm font-normal">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {member.user.email}
                        </p>
                      </div>
                      {community.data?.canManageRoles ? (
                        <select
                          className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm capitalize"
                          value={member.role}
                          disabled={setMemberRole.isPending}
                          onChange={(event) => {
                            const role = event.target.value;
                            if (
                              role !== "owner" &&
                              role !== "admin" &&
                              role !== "member"
                            ) {
                              return;
                            }
                            if (role === member.role) {
                              return;
                            }
                            setMemberRole.mutate({
                              communityId: id,
                              userId: member.user.id,
                              role,
                            });
                          }}
                        >
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-sm capitalize">
                          {member.role}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}

        {community.data?.canManageJoinRequests ? (
          <section className="border-border bg-card rounded-xl border p-6">
            <h3 className="text-foreground text-lg font-medium">
              Join requests
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
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
              <p className="text-destructive mt-4 text-sm">
                {joinRequests.error.message}
              </p>
            ) : null}

            {joinRequests.data?.length === 0 ? (
              <p className="text-muted-foreground mt-4 text-sm">
                No pending requests.
              </p>
            ) : null}

            {joinRequests.data && joinRequests.data.length > 0 ? (
              <ul className="divide-border border-border mt-4 divide-y rounded-lg border">
                {joinRequests.data.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-foreground font-medium">
                        {request.user.name}
                      </p>
                      <p className="text-muted-foreground text-sm">
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
          <p className="text-muted-foreground text-xs">
            Community Public uses request-to-join. Owner or Admin can also send
            a Lookup invite or copy an Invite link. There is no Email invite.
            Invite link admits immediately and skips the request queue.
          </p>
        ) : null}

        {community.data?.canManageLookupInvites ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Lookup invite
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Owner and Admin can look up an existing User by username, email,
                or phone and send a Lookup invite. The invitee accepts on
                Invites. Lookup invites do not expire.
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
                sendLookupInvite.mutate({ communityId: id, query });
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

        {community.data?.canManageInvites ? (
          <section className="border-border bg-card space-y-6 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Private invites
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Owner and Admin can send Email invites.
              </p>
            </div>

            <div className="border-border space-y-3 rounded-lg border p-4">
              <h4 className="text-foreground font-medium">Email invite</h4>
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
                <p className="text-muted-foreground text-sm">
                  No unused Email invites.
                </p>
              ) : null}
              {emailInvites.data && emailInvites.data.length > 0 ? (
                <ul className="divide-border border-border divide-y rounded-lg border">
                  {emailInvites.data.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-foreground font-medium">
                          {invite.email}
                        </p>
                        <p className="text-muted-foreground text-xs">
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
          </section>
        ) : null}

        {community.data?.canManageInviteLinks ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Invite link
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Each copy mints a new 6-hour token. Older copied URLs stay live
                until each expires. There is no rotate or revoke.
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
              onClick={() => createInviteLink.mutate({ communityId: id })}
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
