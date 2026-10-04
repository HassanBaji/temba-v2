"use client";

import Link from "next/link";
import { notFound, usePathname, useRouter } from "next/navigation";
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
import { CommunityHomeChrome } from "~/components/communities/community-home-chrome";
import { CommunityHomeSkeleton } from "~/components/communities/community-home-skeleton";
import { CommunityLinkVenueDialog } from "~/components/communities/community-link-venue-dialog";
import { CommunityMembersTab } from "~/components/communities/community-members-tab";
import { CommunityRequestsTab } from "~/components/communities/community-requests-tab";
import { CommunityTeamsTab } from "~/components/communities/community-teams-tab";
import { CommunityVenueBlock } from "~/components/communities/community-venue-block";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { InvitesDialog } from "~/components/invites/invites-dialog";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent } from "~/components/ui/tabs";
import {
  communityHomeTabFromQuery,
  communityHomeTabQuery,
  type CommunityHomeTab,
} from "@repo/domain/community-home-tab";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  GROUP_CREATED_WITHOUT_IMAGE_TOAST,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import { api } from "~/trpc/react";

export default function CommunityHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const router = useRouter();
  const pathname = usePathname() ?? `/dashboard/communities/${id}`;
  const { hasCreateAccess } = useCreateAccess();
  const utils = api.useUtils();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [linkVenueOpen, setLinkVenueOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupRefused, setLookupRefused] = useState<
    { name: string; message: string }[] | null
  >(null);
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

  const lookupSearch = api.communities.searchLookupUsers.useQuery(
    { communityId: id, query: lookupQuery },
    {
      enabled: invitesOpen && Boolean(community.data?.canManageLookupInvites),
    },
  );

  const sendLookupInvite = api.communities.sendLookupInvite.useMutation({
    onSuccess: async (result) => {
      setLookupRefused(result.refused);
      if (result.sent.length > 0) {
        toast.success(
          result.sent.length === 1
            ? "Lookup invite sent"
            : `${result.sent.length} Lookup invites sent`,
        );
      }
      await utils.communities.listLookupInvites.invalidate({ communityId: id });
      await utils.communities.searchLookupUsers.invalidate({
        communityId: id,
      });
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
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const createClubPrivate = api.groups.createClubPrivate.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const uploadGroupImage = api.groups.uploadImage.useMutation();

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
      await utils.games.listMyGames.invalidate();
    },
  });

  const unarchive = api.communities.unarchive.useMutation({
    onSuccess: async () => {
      toast.success("Community unarchived");
      await utils.communities.byId.invalidate({ id });
      await utils.communities.mine.invalidate();
      await utils.games.listPublicPickup.invalidate();
      await utils.games.listMyGames.invalidate();
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
    createClubPublic.isPending ||
    createClubPrivate.isPending ||
    uploadGroupImage.isPending;
  const viewerUserId = community.data?.membership?.userId;
  const isLastOwnerBlockedLeave =
    community.data?.membership?.role === "owner" &&
    community.data.canLeave === false &&
    !community.data.linkedTeamBlocksLeave;
  const linkedTeamBlocksLeave = Boolean(community.data?.linkedTeamBlocksLeave);

  async function finishClubGroupCreate(
    group: { id: string },
    image: File | null,
    successMessage: string,
  ) {
    if (image) {
      try {
        const input = await entityImageUploadInput(image);
        await uploadGroupImage.mutateAsync({
          groupId: group.id,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
        });
      } catch {
        toast.success(GROUP_CREATED_WITHOUT_IMAGE_TOAST);
        await utils.communities.byId.invalidate({ id });
        await utils.communities.mine.invalidate();
        await utils.groups.mine.invalidate();
        setCreateGroupOpen(false);
        return;
      }
    }
    toast.success(successMessage);
    await utils.communities.byId.invalidate({ id });
    await utils.communities.mine.invalidate();
    await utils.groups.mine.invalidate();
    setCreateGroupOpen(false);
  }

  if (isNotFoundError(community.error)) {
    notFound();
  }

  if (community.isLoading) {
    return (
      <DashboardShell title="Community" hidePageHeader hideMobileTopBar>
        <CommunityHomeSkeleton />
      </DashboardShell>
    );
  }

  if (community.error) {
    return (
      <DashboardShell title="Community" isSubPage>
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
      <DashboardShell title="Community" isSubPage>
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
  const canShowCreateClubGroup = hasCreateAccess && data.canCreateClubGroup;
  const canManageInvites =
    data.canManageLookupInvites || data.canManageInviteLinks;
  const showRequestsTab = data.canManageJoinRequests || data.canManageTeamLinks;
  const availableTabs: CommunityHomeTab[] = [
    "groups",
    ...(isMember ? (["teams", "members"] as const) : []),
    ...(showRequestsTab ? (["requests"] as const) : []),
  ];
  const tab = communityHomeTabFromQuery(tabParam, availableTabs);

  function setTab(next: string) {
    const resolved = communityHomeTabFromQuery(next, availableTabs);
    if (resolved === tab) {
      return;
    }
    router.replace(`${pathname}${communityHomeTabQuery(resolved)}`, {
      scroll: false,
    });
  }
  const requestCount =
    (joinRequests.data?.length ?? 0) + (teamLinkRequests.data?.length ?? 0);
  const showAllCommunities = hasCreateAccess;
  const showCommunityOverflow =
    showAllCommunities ||
    canManageInvites ||
    data.canUnarchive ||
    isMember ||
    data.canSoftArchive;
  const showOverflowAboveDestructive =
    showAllCommunities || canManageInvites || data.canUnarchive;

  const headerMenu = showCommunityOverflow ? (
    <ActionMenu triggerRef={menuTriggerRef} label="Community actions">
      {showAllCommunities ? (
        <ActionMenuItem asChild>
          <Link href="/dashboard/communities">All Communities</Link>
        </ActionMenuItem>
      ) : null}
      {canManageInvites ? (
        <ActionMenuItem onSelect={() => setInvitesOpen(true)}>
          Manage invites
        </ActionMenuItem>
      ) : null}
      {data.canUnarchive ? (
        <ActionMenuItem onSelect={() => unarchive.mutate({ communityId: id })}>
          Unarchive
        </ActionMenuItem>
      ) : null}
      {showOverflowAboveDestructive && (isMember || data.canSoftArchive) ? (
        <ActionMenuSeparator />
      ) : null}
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
  ) : null;

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

  return (
    <DashboardShell
      title={communityName}
      hidePageHeader
      hideMobileTopBar
      hidePageTitle
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-6 gap-0">
        <CommunityHomeChrome
          name={communityName}
          type={data.type}
          sports={data.sports}
          memberCount={data.memberCount}
          role={data.membership?.role ?? null}
          logoImageUrl={data.venue?.logoImageUrl}
          isArchived={!isLive}
          joinStatus={!isMember ? joinStatus : null}
          hasCreateAccess={hasCreateAccess}
          tab={tab}
          availableTabs={availableTabs}
          requestCount={requestCount}
          canInvite={canManageInvites}
          canCreateClubGroup={canShowCreateClubGroup}
          onInvite={() => setInvitesOpen(true)}
          onCreateClubGroup={() => setCreateGroupOpen(true)}
          overflow={headerMenu}
        />

        <div className="space-y-6 pt-6">
          {!isLive && !isMember ? (
            <SoftArchiveBanner
              headingLevel={2}
              heading="This Community is Soft-archived"
            >
              It is not open for new joins, requests, or invites. Members can
              still open history and Games. This is not a missing page.
            </SoftArchiveBanner>
          ) : null}

          {!isLive && isMember ? (
            <SoftArchiveBanner headingLevel={2} heading="Soft-archived">
              Club Groups stay attached. You can still open Groups and see
              history and Games. New joins, requests, Lookup invites, and Invite
              links are paused until an Owner or Admin unarchives.
            </SoftArchiveBanner>
          ) : null}

          {canRequestJoin ? (
            <Button
              type="button"
              className="min-h-11 w-full"
              onClick={() => requestJoin.mutate({ communityId: id })}
              pending={requestJoin.isPending}
              pendingLabel="Requesting…"
            >
              Request to join
            </Button>
          ) : null}

          <TabsContent value="groups">
            <CommunityGroupsTab
              venue={venueBlock}
              groups={data.groups}
              canCreateClubGroup={canShowCreateClubGroup}
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
                canInvite={canManageInvites}
                onInvite={() => setInvitesOpen(true)}
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
        </div>
      </Tabs>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={`Leave ${communityName}?`}
        description="You will leave this Community and its Club Groups."
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
        description="New joins, requests, and invites pause until an Owner or Admin unarchives."
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
        description="This Community will no longer be linked to that Venue."
        confirmLabel="Unlink Venue"
        pending={unlinkVenue.isPending}
        onConfirm={async () => {
          await unlinkVenue.mutateAsync({ communityId: id });
        }}
      />

      <InvitesDialog
        open={invitesOpen}
        onOpenChange={(next) => {
          setInvitesOpen(next);
          if (!next) {
            setLookupQuery("");
            setLookupRefused(null);
          }
        }}
        restoreFocusRef={menuTriggerRef}
        lookup={
          data.canManageLookupInvites
            ? {
                note: "Owners and Admins can invite people. Invites don't expire.",
                lookupInvites: lookupInvites.data,
                sendPending: sendLookupInvite.isPending,
                revokePendingId: revokeLookupInvite.isPending
                  ? revokeLookupInvite.variables?.inviteId
                  : undefined,
                sendError: sendLookupInvite.error,
                searchQuery: lookupQuery,
                onSearchQueryChange: setLookupQuery,
                searchResults: lookupSearch.data,
                searchPending: lookupSearch.isFetching,
                refused: lookupRefused,
                onSendUserIds: (userIds) =>
                  sendLookupInvite.mutate({ communityId: id, userIds }),
                onRevokeLookup: (inviteId) =>
                  revokeLookupInvite.mutate({ inviteId }),
              }
            : null
        }
        link={
          data.canManageInviteLinks
            ? {
                inviteUrl: inviteLink.data?.inviteUrl,
                copyPending: createInviteLink.isPending,
                onCopy: () => createInviteLink.mutate({ communityId: id }),
              }
            : null
        }
      />

      {canShowCreateClubGroup ? (
        <CommunityCreateGroupDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          pending={createClubPending}
          error={createClubPublic.error ?? createClubPrivate.error}
          onCreatePublic={(name, requiresApproval, image) => {
            void (async () => {
              try {
                createClubPrivate.reset();
                const group = await createClubPublic.mutateAsync({
                  communityId: id,
                  name,
                  sport: "padel",
                  requiresApproval,
                });
                await finishClubGroupCreate(group, image, "Club Group created");
              } catch {
                return;
              }
            })();
          }}
          onCreatePrivate={(name, image) => {
            void (async () => {
              try {
                createClubPublic.reset();
                const group = await createClubPrivate.mutateAsync({
                  communityId: id,
                  name,
                  sport: "padel",
                });
                await finishClubGroupCreate(group, image, "Club Group created");
              } catch {
                return;
              }
            })();
          }}
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
          onRetry={() => {
            void liveVenues.refetch();
          }}
          pendingVenueId={
            requestVenueLink.isPending
              ? (requestVenueLink.variables?.venueId ?? null)
              : null
          }
          onRequest={(venueId) =>
            requestVenueLink.mutate({ communityId: id, venueId })
          }
        />
      ) : null}
    </DashboardShell>
  );
}
