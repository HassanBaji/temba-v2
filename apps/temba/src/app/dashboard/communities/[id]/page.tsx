"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use, useRef, useState } from "react";
import * as React from "react";
import { toast } from "sonner";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { CommunityCreateGroupDialog } from "~/components/communities/community-create-group-dialog";
import { CommunityGroupsTab } from "~/components/communities/community-groups-tab";
import { CommunityHomeHeader } from "~/components/communities/community-home-header";
import { CommunityHomeSkeleton } from "~/components/communities/community-home-skeleton";
import { CommunityInvitesDialog } from "~/components/communities/community-invites-dialog";
import { CommunityLinkVenueDialog } from "~/components/communities/community-link-venue-dialog";
import { CommunityMembersTab } from "~/components/communities/community-members-tab";
import { CommunityRequestsTab } from "~/components/communities/community-requests-tab";
import { CommunityTeamsTab } from "~/components/communities/community-teams-tab";
import { CommunityVenueBlock } from "~/components/communities/community-venue-block";
import { DashboardShell } from "~/components/dashboard-shell";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { isNotFoundError } from "~/lib/is-not-found-error";
import { stickyAsideClass } from "~/lib/page-layout";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

export default function CommunityHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [linkVenueOpen, setLinkVenueOpen] = useState(false);
  const [venueQuery, setVenueQuery] = React.useState("");

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
      toastGlobalFormError(error);
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

  const liveVenues = api.communities.searchLiveVenues.useQuery(
    { communityId: id, query: venueQuery },
    { enabled: Boolean(community.data?.canRequestVenueLink) },
  );

  const requestVenueLink = api.communities.requestVenueLink.useMutation({
    onSuccess: async () => {
      toast.success("Venue link requested");
      await utils.communities.byId.invalidate({ id });
      setLinkVenueOpen(false);
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
  });

  const createClubPublic = api.groups.createClubPublic.useMutation({
    onSuccess: async () => {
      toast.success("Club Group Public created");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.groups.mine.invalidate();
      setCreateGroupOpen(false);
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const createClubPrivate = api.groups.createClubPrivate.useMutation({
    onSuccess: async () => {
      toast.success("Club Group Private created");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.groups.mine.invalidate();
      setCreateGroupOpen(false);
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveCommunity = api.communities.leave.useMutation({
    onSuccess: async () => {
      toast.success("Left Community and its Club Groups");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.groups.mine.invalidate();
    },
  });

  const softArchive = api.communities.softArchive.useMutation({
    onSuccess: async () => {
      toast.success("Community Soft-archived");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.games.listPublicPickup.invalidate();
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
  const joinStatus = community.data?.joinRequest?.status ?? null;
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

  if (isNotFoundError(community.error)) {
    notFound();
  }

  if (community.isLoading) {
    return (
      <DashboardShell title="Community" width="wide" hidePageHeader>
        <CommunityHomeSkeleton />
      </DashboardShell>
    );
  }

  if (community.error) {
    return (
      <DashboardShell title="Community" width="wide" hidePageHeader>
        <ErrorState
          title="Community could not be loaded"
          message={community.error.message}
          onRetry={() => {
            void community.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!community.data) {
    return (
      <DashboardShell title="Community" width="wide" hidePageHeader>
        <ErrorState
          title="Community could not be loaded"
          onRetry={() => {
            void community.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = community.data;
  const communityName = data.name ?? "Community";
  const canManageInvites =
    data.canManageLookupInvites || data.canManageInviteLinks;
  const showRequestsTab = data.canManageJoinRequests || data.canManageTeamLinks;
  const requestCount =
    (joinRequests.data?.length ?? 0) + (teamLinkRequests.data?.length ?? 0);

  const headerActions = (
    <>
      {canRequestJoin ? (
        <Button
          className="min-h-11"
          onClick={() => requestJoin.mutate({ communityId: id })}
          disabled={requestJoin.isPending}
        >
          {requestJoin.isPending ? "Requesting…" : "Request to join"}
        </Button>
      ) : null}
      <ActionMenu triggerRef={menuTriggerRef} label="Community actions">
        <ActionMenuItem asChild>
          <Link href="/dashboard/communities">All Communities</Link>
        </ActionMenuItem>
        {canManageInvites ? (
          <ActionMenuItem onSelect={() => setInvitesOpen(true)}>
            Manage invites
          </ActionMenuItem>
        ) : null}
        {data.canUnarchive ? (
          <ActionMenuItem
            onSelect={() => unarchive.mutate({ communityId: id })}
          >
            Unarchive
          </ActionMenuItem>
        ) : null}
        {isMember || data.canSoftArchive ? <ActionMenuSeparator /> : null}
        {isMember ? (
          <ActionMenuItem
            variant="destructive"
            onSelect={() => setLeaveOpen(true)}
          >
            Leave Community
          </ActionMenuItem>
        ) : null}
        {data.canSoftArchive ? (
          <ActionMenuItem
            variant="destructive"
            onSelect={() => setArchiveOpen(true)}
          >
            Soft-archive
          </ActionMenuItem>
        ) : null}
      </ActionMenu>
    </>
  );

  const venueBlock = isMember ? (
    <CommunityVenueBlock
      venue={data.venue}
      venueLinkRequest={data.venueLinkRequest}
      canUnlinkVenue={data.canUnlinkVenue}
      canRequestVenueLink={data.canRequestVenueLink}
      canManageVenueLink={data.canManageVenueLink}
      onUnlink={() => setUnlinkOpen(true)}
      onLinkVenue={() => setLinkVenueOpen(true)}
    />
  ) : null;

  const memberCountCard =
    isMember && members.data ? (
      <Card variant="raised">
        <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
          Members
        </p>
        <p className="text-lead font-semibold tabular-nums">
          {members.data.length}
        </p>
      </Card>
    ) : null;

  const staffCard =
    data.canCreateClubGroup || canManageInvites ? (
      <Card variant="raised" className="gap-2">
        <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
          Actions
        </p>
        {data.canCreateClubGroup ? (
          <Button
            type="button"
            className="min-h-11 w-full"
            onClick={() => setCreateGroupOpen(true)}
          >
            Create Club Group
          </Button>
        ) : null}
        {canManageInvites ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => setInvitesOpen(true)}
          >
            Manage invites
          </Button>
        ) : null}
      </Card>
    ) : null;

  return (
    <DashboardShell title={communityName} width="wide" hidePageHeader>
      <div className="space-y-6">
        <CommunityHomeHeader
          name={communityName}
          type={data.type}
          sports={data.sports}
          role={data.membership?.role ?? null}
          isArchived={!isLive}
          joinStatus={!isMember ? joinStatus : null}
          logoImageUrl={data.venue?.logoImageUrl}
          actions={headerActions}
        />

        {!isLive && !isMember ? (
          <SoftArchiveBanner heading="This Community is Soft-archived">
            It is not open for new joins, requests, or invites. Members can
            still open history and Games. This is not a missing page.
          </SoftArchiveBanner>
        ) : null}

        {!isLive && isMember ? (
          <SoftArchiveBanner heading="Soft-archived">
            Club Groups stay attached. You can still open Groups and see history
            and Games. New joins, requests, Lookup invites, and Invite links are
            paused until an Owner or Admin unarchives.
          </SoftArchiveBanner>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="min-w-0 space-y-6 lg:hidden">{venueBlock}</div>
          <div className="min-w-0">
            <Tabs defaultValue="groups" className="gap-4">
              <TabsList
                variant="line"
                className="bg-background sticky top-11 z-20 h-11 min-h-11 w-full max-w-full justify-start overflow-x-auto overflow-y-hidden rounded-none lg:top-0"
              >
                <TabsTrigger
                  value="groups"
                  className="min-h-11 min-w-11 flex-none px-3"
                >
                  Groups
                </TabsTrigger>
                {isMember ? (
                  <TabsTrigger
                    value="teams"
                    className="min-h-11 min-w-11 flex-none px-3"
                  >
                    Teams
                  </TabsTrigger>
                ) : null}
                {isMember ? (
                  <TabsTrigger
                    value="members"
                    className="min-h-11 min-w-11 flex-none px-3"
                  >
                    Members
                  </TabsTrigger>
                ) : null}
                {showRequestsTab ? (
                  <TabsTrigger
                    value="requests"
                    className="min-h-11 min-w-11 flex-none gap-2 px-3"
                  >
                    Requests
                    {requestCount > 0 ? (
                      <Badge variant="secondary" size="sm">
                        {requestCount}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                ) : null}
              </TabsList>
              <TabsContent value="groups">
                <CommunityGroupsTab
                  groups={data.groups}
                  canCreateClubGroup={data.canCreateClubGroup}
                  onCreate={() => setCreateGroupOpen(true)}
                />
              </TabsContent>
              {isMember ? (
                <TabsContent value="teams">
                  <CommunityTeamsTab teams={data.teams} />
                </TabsContent>
              ) : null}
              {isMember ? (
                <TabsContent value="members">
                  <CommunityMembersTab
                    members={members.data}
                    isLoading={members.isLoading}
                    errorMessage={members.error?.message}
                    onRetry={() => {
                      void members.refetch();
                    }}
                    viewerUserId={viewerUserId}
                    canManageRoles={data.canManageRoles}
                    rolePending={setMemberRole.isPending}
                    onRoleChange={(userId, role) =>
                      setMemberRole.mutate({
                        communityId: id,
                        userId,
                        role,
                      })
                    }
                    linkedTeamBlocksLeave={linkedTeamBlocksLeave}
                    isLastOwnerBlockedLeave={isLastOwnerBlockedLeave}
                  />
                </TabsContent>
              ) : null}
              {showRequestsTab ? (
                <TabsContent value="requests">
                  <CommunityRequestsTab
                    canManageJoinRequests={data.canManageJoinRequests}
                    canManageTeamLinks={data.canManageTeamLinks}
                    joinRequests={joinRequests.data}
                    joinLoading={joinRequests.isLoading}
                    joinError={joinRequests.error?.message}
                    onRetryJoin={() => {
                      void joinRequests.refetch();
                    }}
                    teamLinkRequests={teamLinkRequests.data}
                    teamLoading={teamLinkRequests.isLoading}
                    teamError={teamLinkRequests.error?.message}
                    onRetryTeam={() => {
                      void teamLinkRequests.refetch();
                    }}
                    approveJoinPendingId={
                      approveJoinRequest.isPending
                        ? approveJoinRequest.variables?.requestId
                        : undefined
                    }
                    rejectJoinPendingId={
                      rejectJoinRequest.isPending
                        ? rejectJoinRequest.variables?.requestId
                        : undefined
                    }
                    approveTeamPendingId={
                      approveTeamLink.isPending
                        ? approveTeamLink.variables?.requestId
                        : undefined
                    }
                    rejectTeamPendingId={
                      rejectTeamLink.isPending
                        ? rejectTeamLink.variables?.requestId
                        : undefined
                    }
                    onApproveJoin={(requestId) =>
                      approveJoinRequest.mutate({ requestId })
                    }
                    onRejectJoin={(requestId) =>
                      rejectJoinRequest.mutate({ requestId })
                    }
                    onApproveTeam={(requestId) =>
                      approveTeamLink.mutate({ requestId })
                    }
                    onRejectTeam={(requestId) =>
                      rejectTeamLink.mutate({ requestId })
                    }
                  />
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
          <aside className={stickyAsideClass}>
            {venueBlock}
            {memberCountCard}
            {staffCard}
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={`Leave ${communityName}?`}
        description="You will leave this Community and its Club Groups. Cancelling does nothing."
        confirmLabel="Leave Community"
        pending={leaveCommunity.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await leaveCommunity.mutateAsync({ communityId: id });
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Soft-archive ${communityName}?`}
        description="New joins, requests, and invites pause until an Owner or Admin unarchives. Cancelling does nothing."
        confirmLabel="Soft-archive"
        pending={softArchive.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await softArchive.mutateAsync({ communityId: id });
        }}
      />

      <ConfirmDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        title={data.venue ? `Unlink ${data.venue.name}?` : "Unlink Venue?"}
        description="This Community will no longer be linked to that Venue. Cancelling does nothing."
        confirmLabel="Unlink Venue"
        pending={unlinkVenue.isPending}
        onConfirm={async () => {
          await unlinkVenue.mutateAsync({ communityId: id });
        }}
      />

      <CommunityInvitesDialog
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
        restoreFocusRef={menuTriggerRef}
        canManageLookupInvites={data.canManageLookupInvites}
        canManageInviteLinks={data.canManageInviteLinks}
        lookupInvites={lookupInvites.data}
        inviteUrl={inviteLink.data?.inviteUrl}
        sendPending={sendLookupInvite.isPending}
        revokePending={revokeLookupInvite.isPending}
        copyPending={createInviteLink.isPending}
        sendError={sendLookupInvite.error}
        onSendLookup={(query) =>
          sendLookupInvite.mutate({ communityId: id, query })
        }
        onRevokeLookup={(inviteId) => revokeLookupInvite.mutate({ inviteId })}
        onCopyInviteLink={() => createInviteLink.mutate({ communityId: id })}
      />

      {data.canCreateClubGroup ? (
        <CommunityCreateGroupDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          pending={createClubPending}
          publicPending={createClubPublic.isPending}
          privatePending={createClubPrivate.isPending}
          publicError={createClubPublic.error}
          privateError={createClubPrivate.error}
          onCreatePublic={(name) =>
            createClubPublic.mutate({
              communityId: id,
              name,
              sport: "padel",
            })
          }
          onCreatePrivate={(name) =>
            createClubPrivate.mutate({
              communityId: id,
              name,
              sport: "padel",
            })
          }
        />
      ) : null}

      {data.canRequestVenueLink ? (
        <CommunityLinkVenueDialog
          open={linkVenueOpen}
          onOpenChange={setLinkVenueOpen}
          query={venueQuery}
          onQueryChange={setVenueQuery}
          venues={liveVenues.data}
          isLoading={liveVenues.isLoading}
          errorMessage={liveVenues.error?.message}
          pending={requestVenueLink.isPending}
          onRequest={(venueId) =>
            requestVenueLink.mutate({ communityId: id, venueId })
          }
        />
      ) : null}
    </DashboardShell>
  );
}
