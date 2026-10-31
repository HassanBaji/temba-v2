"use client";

import {
  groupLeaveVenueConfirm,
  groupLeftVenueToast,
  groupLinkRequestBannerText,
  groupPartOfVenueLine,
} from "@repo/domain/group-link-request";
import { notFound, usePathname, useRouter } from "next/navigation";
import { use, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { RenameUnclaimedPlayerDialog } from "~/components/common/rename-unclaimed-player-dialog";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GroupAddPlayerDialog } from "~/components/groups/group-add-player-dialog";
import { GroupGamesTab } from "~/components/groups/group-games-tab";
import { VenueLinkRequestActions } from "~/components/groups/venue-link-request-actions";
import { GroupHomeChrome } from "~/components/groups/group-home-chrome";
import {
  groupMemberOrganizerToast,
  groupShowsLevel,
} from "@repo/domain/group-home-chrome";
import { GroupHomeOverflowMenu } from "~/components/groups/group-home-overflow-menu";
import { GroupHomeSkeleton } from "~/components/groups/group-home-skeleton";
import {
  JoinRequestsBanner,
  JoinRequestsCard,
  RejectRequestDialog,
  WhoCanJoinDialog,
  type JoinRequest,
} from "~/components/groups/group-join-requests-section";
import { RequestJoinDialog } from "~/components/groups/request-join-dialog";
import { GroupMembersTab } from "~/components/groups/group-members-tab";
import { GroupStandingTab } from "~/components/groups/group-standing-tab";
import { InviteDoorDialog } from "~/components/invites/invite-door-dialog";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent } from "~/components/ui/tabs";
import { groupMembersTabHref } from "~/lib/dashboard-paths";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { gameJoinToast } from "@repo/domain/game-copy";
import {
  REMOVE_UNCLAIMED_PLAYER_ACTION,
  addGroupPlayerIsFootball,
  removeUnclaimedPlayerConfirmLine,
  removeUnclaimedPlayerToast,
} from "@repo/domain/add-player-by-phone";
import {
  groupHomeCanManageInvites,
  groupHomeCanShowCreateGame,
  groupHomeCtaFamily,
  groupHomeNextJoinableGame,
  groupHomeOverflowItems,
} from "@repo/domain/group-home-cta";
import {
  groupHomeTabFromQuery,
  groupHomeTabQuery,
} from "@repo/domain/group-home-tab";
import {
  ENTITY_IMAGE_ACCEPT,
  entityImageFileError,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import {
  groupHomeBanner,
  groupHasGames,
  groupHomeCanJoin,
  groupHomeJoinDoor,
  groupJoinDisabled,
  groupJoinLabel,
  groupJoinToast,
  groupLeaveConfirm,
  groupLeaveToast,
  type GroupJoinMode,
} from "@repo/domain/group-join";
import {
  GROUP_DELETED_TOAST,
  GROUP_IMAGE_REMOVED_TOAST,
  GROUP_IMAGE_SAVED_TOAST,
  GROUP_JOIN_REQUEST_UNDO_LABEL,
  groupJoinRequestDecidedToast,
  type GroupJoinRequestDecision,
  groupDeleteConfirm,
  groupRemoveImageConfirm,
} from "@repo/domain/group-admin";
import { groupInviteClipboardText } from "@repo/domain/group-invite-share-message";
import { groupLookupNote } from "@repo/domain/invites";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { groupMemberRowsLink } from "@repo/domain/player-profile";
import { api, type RouterOutputs } from "~/trpc/react";

type ScheduledGame = RouterOutputs["groups"]["byId"]["upcomingGames"][number];

// Panels stay mounted so switching back to a tab does not rebuild its rows or
// reload its avatars. Radix skips the fade on the first paint.
const TAB_PANEL =
  "data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 duration-150 motion-reduce:animate-none";

export default function GroupHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    saved?: string | string[];
  }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const [tab, setTabState] = useState(() => groupHomeTabFromQuery(tabParam));
  const savedUserId =
    (Array.isArray(query.saved) ? query.saved[0] : query.saved) ?? null;
  const { hasCreateAccess } = useCreateAccess();
  const router = useRouter();
  const pathname = usePathname() ?? `/dashboard/groups/${id}`;
  const utils = api.useUtils();
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveVenueOpen, setLeaveVenueOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeImageOpen, setRemoveImageOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [requestJoinOpen, setRequestJoinOpen] = useState(false);
  const [whoCanJoinOpen, setWhoCanJoinOpen] = useState(false);
  const [rejecting, setRejecting] = useState<JoinRequest | null>(null);
  const joinRequestsRef = useRef<HTMLElement>(null);
  const [removing, setRemoving] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [renaming, setRenaming] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [restoreFocus, setRestoreFocus] = useState<"mobile" | "desktop">(
    "desktop",
  );

  const group = api.groups.byId.useQuery({ id });
  const pendingLinkRequests = api.groups.pendingLinkRequests.useQuery(
    undefined,
    { enabled: (group.data?.pendingLinkRequestCount ?? 0) > 0 },
  );

  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );
  const joinClubPublic = api.groups.joinClubPublic.useMutation({
    onSuccess: async () => {
      toast.success(groupJoinToast("joinClubPublic"));
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
      toast.success(groupJoinToast("joinLoosePublic"));
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestJoin = api.groups.requestJoin.useMutation({
    onSuccess: async () => {
      setRequestJoinOpen(false);
      toast.success(groupJoinToast("requestJoin"));
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
      await utils.groups.listJoinRequests.invalidate({ groupId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setRequiresApproval = api.groups.setRequiresApproval.useMutation({
    onSuccess: async () => {
      setWhoCanJoinOpen(false);
      await utils.groups.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinRequests = api.groups.listJoinRequests.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canDecideJoinRequests) },
  );

  async function refreshJoinRequests() {
    await Promise.all([
      utils.groups.byId.invalidate({ id }),
      utils.groups.mine.invalidate(),
      utils.groups.listJoinRequests.invalidate({ groupId: id }),
      group.data?.communityId
        ? utils.communities.byId.invalidate({
            id: group.data.communityId,
          })
        : Promise.resolve(),
      group.data?.communityId
        ? utils.communities.mine.invalidate()
        : Promise.resolve(),
      group.data?.communityId
        ? utils.communities.listJoinRequests.invalidate({
            communityId: group.data.communityId,
          })
        : Promise.resolve(),
    ]);
  }

  const undoJoinRequestDecision =
    api.groups.undoJoinRequestDecision.useMutation({
      onSettled: refreshJoinRequests,
      onError: (error) => {
        toast.error(error.message);
      },
    });

  function toastJoinRequestDecided(
    request: JoinRequest,
    decision: GroupJoinRequestDecision,
  ) {
    toast.success(
      groupJoinRequestDecidedToast(request.user.name ?? "User", decision),
      {
        action: {
          label: GROUP_JOIN_REQUEST_UNDO_LABEL,
          onClick: () =>
            undoJoinRequestDecision.mutate({ requestId: request.id }),
        },
      },
    );
  }

  const approveJoinRequest = api.groups.approveJoinRequest.useMutation({
    onSettled: refreshJoinRequests,
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectJoinRequest = api.groups.rejectJoinRequest.useMutation({
    onSettled: refreshJoinRequests,
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const leaveGroup = api.groups.leave.useMutation({
    onSuccess: async (result) => {
      toast.success(groupLeaveToast(result.communityId));
      await utils.groups.byId.invalidate({ id });
      await utils.groups.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
      }
    },
  });

  const setOrganizer = api.groups.setOrganizer.useMutation({
    onSuccess: async () => {
      await utils.groups.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlinkFromVenue = api.groups.unlinkFromVenue.useMutation({
    onSuccess: async () => {
      toast.success(
        groupLeftVenueToast(
          group.data?.venueCommunity?.venueName ?? "the Venue",
        ),
      );
      await Promise.all([
        utils.groups.byId.invalidate({ id }),
        utils.groups.mine.invalidate(),
        utils.groups.mineLoose.invalidate(),
        utils.communities.mine.invalidate(),
      ]);
    },
  });

  const deleteGroup = api.groups.delete.useMutation({
    onSuccess: async (result) => {
      toast.success(GROUP_DELETED_TOAST);
      await utils.groups.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
        router.push(`/dashboard/communities/${result.communityId}`);
        return;
      }
      router.push("/dashboard/groups");
    },
  });

  async function invalidateGroupImage() {
    await Promise.all([
      utils.groups.byId.invalidate({ id }),
      utils.groups.mine.invalidate(),
      utils.groups.listPublic.invalidate(),
      utils.groups.pendingLookupInvites.invalidate(),
    ]);
  }

  const uploadImage = api.groups.uploadImage.useMutation({
    onSuccess: async () => {
      toast.success(GROUP_IMAGE_SAVED_TOAST);
      await invalidateGroupImage();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const clearImage = api.groups.clearImage.useMutation({
    onSuccess: async () => {
      toast.success(GROUP_IMAGE_REMOVED_TOAST);
      await invalidateGroupImage();
    },
  });

  async function refreshMembers() {
    await Promise.all([
      utils.groups.byId.invalidate({ id }),
      utils.groups.listLookupInvites.invalidate({ groupId: id }),
      group.data?.communityId
        ? utils.communities.byId.invalidate({ id: group.data.communityId })
        : Promise.resolve(),
    ]);
  }

  const removeUnclaimedPlayer = api.groups.removeUnclaimedPlayer.useMutation({
    onSuccess: async () => {
      await utils.groups.byId.invalidate({ id });
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

  // Seat join and register from a Scheduled card: the same doors and the same
  // invalidation the Games hub runs, plus this Group — one join changes its
  // Games list, its Standing and its member counts, which are one payload.
  async function refreshAfterGameJoin() {
    await Promise.all([
      utils.groups.byId.invalidate({ id }),
      utils.games.listMyGames.invalidate(),
      utils.games.listPublicPickup.invalidate(),
      utils.games.listMyMatchHistory.invalidate(),
      utils.users.home.invalidate(),
      utils.games.byId.invalidate(),
    ]);
  }

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(gameJoinToast(result.waitlisted));
      await refreshAfterGameJoin();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refreshAfterGameJoin();
    },
  });

  const registerGame = api.games.register.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      await refreshAfterGameJoin();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refreshAfterGameJoin();
    },
  });

  const pendingGameId =
    (registerSeat.isPending ? registerSeat.variables?.gameId : null) ??
    (registerGame.isPending ? registerGame.variables?.gameId : null) ??
    null;

  function onJoinSeat(
    gameId: string,
    sideIndex: number,
    position: "left" | "right",
  ) {
    registerSeat.mutate({ gameId, sideIndex, position });
  }

  function onJoinWaitlist(game: ScheduledGame) {
    if (game.format === "americano") {
      registerGame.mutate({ gameId: game.id });
      return;
    }
    registerSeat.mutate({ gameId: game.id });
  }

  function onRegisterGame(gameId: string) {
    registerGame.mutate({ gameId });
  }

  const joinPending =
    joinClubPublic.isPending ||
    joinLoosePublic.isPending ||
    requestJoin.isPending;

  function setTab(next: string) {
    const resolved = groupHomeTabFromQuery(next);
    if (resolved === tab) {
      return;
    }
    setTabState(resolved);
    // router.replace would refetch the page from the server and remount it on
    // every switch. Next keeps useSearchParams in step with replaceState, so
    // the URL still records the tab without the round trip.
    window.history.replaceState(
      null,
      "",
      `${pathname}${groupHomeTabQuery(resolved)}`,
    );
  }

  function onJoin() {
    const door = group.data ? groupHomeJoinDoor(group.data) : null;
    if (door === "requestJoin") {
      setRequestJoinOpen(true);
    } else if (door === "joinLoosePublic") {
      joinLoosePublic.mutate({ groupId: id });
    } else if (door === "joinClubPublic") {
      joinClubPublic.mutate({ groupId: id });
    }
  }

  async function copyGroupUrl() {
    const url = `${window.location.origin}/dashboard/groups/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Group URL copied");
  }

  function onChangeImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadImage.isPending) {
      return;
    }
    const pickedError = entityImageFileError(file);
    if (pickedError) {
      toast.error(pickedError);
      return;
    }
    void entityImageUploadInput(file)
      .then((input) =>
        uploadImage.mutateAsync({
          groupId: id,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
        }),
      )
      .catch(() => undefined);
  }

  if (isNotFoundError(group.error)) {
    notFound();
  }

  if (group.isLoading) {
    return (
      <DashboardShell title="Group" hidePageHeader hideMobileTopBar>
        <GroupHomeSkeleton />
      </DashboardShell>
    );
  }

  if (group.error) {
    return (
      <DashboardShell title="Group">
        <ErrorState
          title="Group could not be loaded"
          message={group.error.message}
          onRetry={() => {
            void group.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!group.data) {
    return (
      <DashboardShell title="Group">
        <ErrorState
          title="Group could not be loaded"
          onRetry={() => {
            void group.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = group.data;
  const groupName = data.name ?? "Group";
  const venueName = data.venueCommunity?.venueName ?? "the Venue";
  const canShowCreateGame = groupHomeCanShowCreateGame({
    canCreateGame: data.canCreateGame,
  });
  const canManageInvites = groupHomeCanManageInvites({
    canManageLookupInvites: data.canManageLookupInvites,
    canManageInviteLinks: data.canManageInviteLinks,
  });
  const ctaFamily = groupHomeCtaFamily({
    canJoin: groupHomeCanJoin(data.joinMode),
    nextJoinableGameId:
      groupHomeNextJoinableGame(data.upcomingGames, Boolean(data.membership))
        ?.id ?? null,
    canCreateGame: data.canCreateGame,
    canManageLookupInvites: data.canManageLookupInvites,
    canManageInviteLinks: data.canManageInviteLinks,
  });
  const overflowItems = groupHomeOverflowItems({
    family: ctaFamily,
    hasCommunity: data.community != null,
    hasCreateAccess,
    canShowCreateGame,
    isLoosePublic: data.isLoose && data.type === "public",
    canManageInvites,
    canManageImage: data.canManageImage,
    hasImage: Boolean(data.imageUrl),
    isMember: data.membership != null,
    canDelete: data.canDelete,
    canLeaveVenueCommunity: data.canUnlinkFromVenue,
  });
  const leaveConfirm = groupLeaveConfirm(groupName);
  const leaveVenueConfirm = groupLeaveVenueConfirm(groupName, venueName);
  const deleteConfirm = groupDeleteConfirm(groupName);
  const removeImageConfirm = groupRemoveImageConfirm(groupName);
  const restoreFocusRef =
    restoreFocus === "mobile" ? mobileMenuTriggerRef : desktopMenuTriggerRef;

  const overflowMenu = (which: "mobile" | "desktop") => (
    <GroupHomeOverflowMenu
      items={overflowItems}
      groupId={id}
      communityId={data.community?.id ?? null}
      communityName={data.community?.name ?? null}
      venueName={data.venueCommunity?.venueName ?? null}
      triggerRef={
        which === "mobile" ? mobileMenuTriggerRef : desktopMenuTriggerRef
      }
      onCopyGroupUrl={() => void copyGroupUrl()}
      onManageInvites={() => {
        setRestoreFocus(which);
        setInvitesOpen(true);
      }}
      onChangeImage={() => {
        setRestoreFocus(which);
        window.setTimeout(() => {
          imageInputRef.current?.click();
        }, 0);
      }}
      onRemoveImage={() => {
        setRestoreFocus(which);
        setRemoveImageOpen(true);
      }}
      onLeaveVenueCommunity={() => {
        setRestoreFocus(which);
        setLeaveVenueOpen(true);
      }}
      onLeave={() => {
        setRestoreFocus(which);
        setLeaveOpen(true);
      }}
      onDelete={() => {
        setRestoreFocus(which);
        setDeleteOpen(true);
      }}
    />
  );

  const bannerCopy = groupHomeBanner({
    isCommunityArchived: data.isCommunityArchived,
    hasCommunityMembership: Boolean(data.communityMembership),
    communityId: data.communityId,
    communityName: data.community?.name ?? null,
    joinMode: data.joinMode,
  });
  const venueRequestBanners = (pendingLinkRequests.data ?? [])
    .filter((request) => request.groupId === id)
    .map((request) => (
      <section
        key={request.id}
        role="status"
        className="bg-muted flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 md:p-5"
      >
        <p className="text-body min-w-0 flex-1">
          {groupLinkRequestBannerText(request.venueName)}
        </p>
        <VenueLinkRequestActions request={request} />
      </section>
    ));
  const banners = bannerCopy ? (
    bannerCopy.heading ? (
      <SoftArchiveBanner headingLevel={2} heading={bannerCopy.heading}>
        {bannerCopy.body}
      </SoftArchiveBanner>
    ) : (
      <p className="text-body text-muted-foreground">{bannerCopy.body}</p>
    )
  ) : null;

  return (
    <DashboardShell
      title={groupName}
      hidePageHeader
      hideMobileTopBar
      hidePageTitle
    >
      {/* <div className="md:-mt-6 lg:mt-0">
        <GroupHomeTopBar name={groupName} overflow={overflowMenu("mobile")} />
      </div> */}

      <Tabs value={tab} onValueChange={setTab} className="mt-6 gap-0">
        <GroupHomeChrome
          groupId={id}
          communityId={data.communityId ?? null}
          name={groupName}
          imageUrl={data.imageUrl}
          sport={data.sport ?? null}
          memberCount={data.standing.memberCount}
          createdAt={data.createdAt}
          tab={tab}
          canInvite={canManageInvites}
          canCreateGame={canShowCreateGame}
          onInvite={() => setInvitesOpen(true)}
          overflow={overflowMenu("desktop")}
          imagePending={uploadImage.isPending}
        />

        <div className="space-y-6 pt-6">
          {venueRequestBanners}
          {data.venueCommunity ? (
            <p className="text-body text-muted-foreground">
              {groupPartOfVenueLine(data.venueCommunity.venueName)}
            </p>
          ) : null}
          {banners}

          {ctaFamily.kind === "join_group" ? (
            <Button
              type="button"
              className="min-h-11 w-full"
              disabled={groupJoinDisabled(
                data.joinMode as GroupJoinMode,
                joinPending,
              )}
              onClick={onJoin}
            >
              {groupJoinLabel(
                data.joinMode as GroupJoinMode,
                joinPending,
                "home",
              )}
            </Button>
          ) : null}

          <TabsContent value="standing" forceMount className={TAB_PANEL}>
            <GroupStandingTab
              isMember={Boolean(data.membership)}
              linkToPlayers={groupMemberRowsLink(data.membership)}
              leaderboard={data.standing.leaderboard}
              groupId={id}
              canShowCreateGame={canShowCreateGame}
              hasGames={groupHasGames(data)}
              totalGamesPlayed={data.totalGamesPlayed}
              awaitingScoreCount={data.standing.awaitingScoreCount}
              showLevel={groupShowsLevel(data.sport)}
              canInvite={canManageInvites}
              onInvite={() => setInvitesOpen(true)}
            />
          </TabsContent>
          <TabsContent value="games" forceMount className={TAB_PANEL}>
            <GroupGamesTab
              upcomingGames={data.upcomingGames}
              gameHistory={data.gameHistory}
              groupId={id}
              groupName={data.name}
              isCommunityArchived={data.isCommunityArchived}
              canShowCreateGame={canShowCreateGame}
              pendingGameId={pendingGameId}
              onJoinSeat={onJoinSeat}
              onJoinWaitlist={onJoinWaitlist}
              onRegister={onRegisterGame}
              sport={data.sport ?? null}
              members={data.standing.leaderboard}
              isMember={Boolean(data.membership)}
              canInvite={canManageInvites}
              onInvite={() => setInvitesOpen(true)}
            />
          </TabsContent>
          <TabsContent value="members" forceMount className={TAB_PANEL}>
            <div className="flex flex-col gap-[26px]">
              <GroupMembersTab
                groupId={id}
                canSetLevel={
                  data.viewerCanSetLevel && groupShowsLevel(data.sport)
                }
                showLevel={groupShowsLevel(data.sport)}
                savedUserId={savedUserId}
                onDismissSaved={() =>
                  router.replace(groupMembersTabHref(id), { scroll: false })
                }
                members={data.standing.leaderboard.map((entry) => ({
                  userId: entry.userId,
                  name: entry.name ?? "Member",
                  image: entry.image,
                  isViewer: entry.isViewer,
                  isOrganizer: entry.isOrganizer,
                  isAppointedOrganizer: entry.isAppointedOrganizer,
                  joinedAt: entry.joinedAt,
                  lastPlayedAt: entry.lastPlayedAt,
                  totalGamesPlayed: entry.totalGamesPlayed,
                  wins: entry.wins,
                  levelBand: entry.levelBand,
                  levelProvisional: entry.levelProvisional,
                  level: entry.level,
                  ratedMatchCount: entry.ratedMatchCount,
                  levelOverride: entry.levelOverride,
                  unclaimed: entry.unclaimed,
                  phoneMasked: entry.phoneMasked,
                }))}
                linkToPlayers={groupMemberRowsLink(data.membership)}
                canInvite={canManageInvites}
                onInvite={() => setInvitesOpen(true)}
                canAddPlayers={data.canAddPlayers}
                onAddPlayer={() => setAddPlayerOpen(true)}
                onRenameUnclaimed={setRenaming}
                onRemoveUnclaimed={setRemoving}
                canAppointOrganizers={data.canAppointOrganizers}
                pendingInvites={
                  data.canManageLookupInvites
                    ? (lookupInvites.data ?? []).map((invite) => ({
                        id: invite.id,
                        name: invite.user.name,
                        invitedAt: invite.createdAt,
                      }))
                    : []
                }
                revokeInvitePendingId={
                  revokeLookupInvite.isPending
                    ? revokeLookupInvite.variables?.inviteId
                    : undefined
                }
                onRevokeInvite={(inviteId) =>
                  revokeLookupInvite.mutate({ inviteId })
                }
                top={
                  data.canDecideJoinRequests ? (
                    <JoinRequestsBanner
                      count={joinRequests.data?.length ?? 0}
                      onReview={() => {
                        joinRequestsRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                        joinRequestsRef.current?.focus({
                          preventScroll: true,
                        });
                      }}
                    />
                  ) : null
                }
                afterTable={
                  data.canDecideJoinRequests ? (
                    <JoinRequestsCard
                      ref={joinRequestsRef}
                      requests={joinRequests.data}
                      loading={joinRequests.isLoading}
                      error={joinRequests.error?.message}
                      onRetry={() => {
                        void joinRequests.refetch();
                      }}
                      requiresApproval={data.requiresApproval}
                      approvedToday={data.joinRequestsApprovedToday}
                      communityName={data.community?.name ?? null}
                      showLevel={groupShowsLevel(data.sport)}
                      linkToProfiles={groupMemberRowsLink(data.membership)}
                      approvePendingId={
                        approveJoinRequest.isPending
                          ? approveJoinRequest.variables?.requestId
                          : undefined
                      }
                      rejectPendingId={
                        rejectJoinRequest.isPending
                          ? rejectJoinRequest.variables?.requestId
                          : undefined
                      }
                      onApprove={(request) =>
                        approveJoinRequest.mutate(
                          { requestId: request.id },
                          {
                            onSuccess: () =>
                              toastJoinRequestDecided(request, "approved"),
                          },
                        )
                      }
                      onAskReject={setRejecting}
                      onChangePolicy={() => setWhoCanJoinOpen(true)}
                    />
                  ) : null
                }
                onOrganizerAction={(member, action) =>
                  setOrganizer.mutate(
                    {
                      groupId: id,
                      userId: member.userId,
                      organizer: action === "appoint",
                    },
                    {
                      onSuccess: () => {
                        toast.success(
                          groupMemberOrganizerToast(action, member.name),
                        );
                      },
                    },
                  )
                }
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <RequestJoinDialog
        open={requestJoinOpen}
        onOpenChange={setRequestJoinOpen}
        pending={requestJoin.isPending}
        onSend={(note) =>
          requestJoin.mutate({ groupId: id, note: note.trim() || undefined })
        }
      />
      {data.canDecideJoinRequests ? (
        <>
          <RejectRequestDialog
            request={rejecting}
            communityName={data.community?.name ?? null}
            pending={
              rejectJoinRequest.isPending
                ? rejectJoinRequest.variables?.block
                  ? "block"
                  : "reject"
                : null
            }
            onOpenChange={(open) => {
              if (!open) {
                setRejecting(null);
              }
            }}
            onReject={(block) => {
              if (!rejecting) {
                return;
              }
              const request = rejecting;
              rejectJoinRequest.mutate(
                { requestId: request.id, block },
                {
                  onSuccess: () => {
                    setRejecting(null);
                    toastJoinRequestDecided(
                      request,
                      block ? "blocked" : "rejected",
                    );
                  },
                },
              );
            }}
          />
          <WhoCanJoinDialog
            open={whoCanJoinOpen}
            onOpenChange={setWhoCanJoinOpen}
            requiresApproval={data.requiresApproval}
            communityName={data.community?.name ?? null}
            pending={setRequiresApproval.isPending}
            onSave={(requiresApproval) =>
              setRequiresApproval.mutate({ groupId: id, requiresApproval })
            }
          />
        </>
      ) : null}

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={leaveConfirm.title}
        description={leaveConfirm.description}
        confirmLabel={leaveConfirm.confirmLabel}
        pending={leaveGroup.isPending}
        restoreFocusRef={restoreFocusRef}
        onConfirm={async () => {
          await leaveGroup.mutateAsync({ groupId: id });
        }}
      />

      <ConfirmDialog
        open={leaveVenueOpen}
        onOpenChange={setLeaveVenueOpen}
        title={leaveVenueConfirm.title}
        description={[
          leaveVenueConfirm.description,
          ...leaveVenueConfirm.consequences,
        ].join(" ")}
        confirmLabel={leaveVenueConfirm.confirmLabel}
        cancelLabel={leaveVenueConfirm.cancelLabel}
        pending={unlinkFromVenue.isPending}
        restoreFocusRef={restoreFocusRef}
        onConfirm={async () => {
          await unlinkFromVenue.mutateAsync({ groupId: id });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteConfirm.title}
        description={deleteConfirm.description}
        confirmLabel={deleteConfirm.confirmLabel}
        pending={deleteGroup.isPending}
        restoreFocusRef={restoreFocusRef}
        onConfirm={async () => {
          await deleteGroup.mutateAsync({ groupId: id });
        }}
      />

      <ConfirmDialog
        open={removeImageOpen}
        onOpenChange={setRemoveImageOpen}
        title={removeImageConfirm.title}
        description={removeImageConfirm.description}
        confirmLabel={removeImageConfirm.confirmLabel}
        pending={clearImage.isPending}
        restoreFocusRef={restoreFocusRef}
        onConfirm={async () => {
          await clearImage.mutateAsync({ groupId: id });
        }}
      />

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(next) => {
          if (!next) {
            setRemoving(null);
          }
        }}
        title={REMOVE_UNCLAIMED_PLAYER_ACTION}
        description={
          removing ? removeUnclaimedPlayerConfirmLine(removing.name) : undefined
        }
        confirmLabel="Remove"
        pending={removeUnclaimedPlayer.isPending}
        onConfirm={async () => {
          if (removing) {
            await removeUnclaimedPlayer.mutateAsync({
              groupId: id,
              userId: removing.userId,
            });
            toast.success(removeUnclaimedPlayerToast(removing.name));
          }
        }}
      />

      {data.canAddPlayers ? (
        <RenameUnclaimedPlayerDialog
          player={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {data.canAddPlayers ? (
        <GroupAddPlayerDialog
          open={addPlayerOpen}
          onOpenChange={setAddPlayerOpen}
          groupId={id}
          isFootball={addGroupPlayerIsFootball(data.sport)}
          onDone={refreshMembers}
        />
      ) : null}

      {data.canManageImage ? (
        <input
          ref={imageInputRef}
          type="file"
          accept={ENTITY_IMAGE_ACCEPT}
          className="hidden"
          tabIndex={-1}
          disabled={uploadImage.isPending || clearImage.isPending}
          onChange={onChangeImageFile}
        />
      ) : null}

      <InviteDoorDialog
        door={{
          kind: "group",
          groupId: id,
          canLookup: data.canManageLookupInvites,
          canLink: data.canManageInviteLinks,
          subtitle: groupLookupNote(data.isLoose),
          shareMessage: (inviteUrl) =>
            groupInviteClipboardText({
              groupName: data.name,
              sport: data.sport,
              inviteUrl,
            }),
        }}
        open={invitesOpen}
        onOpenChange={setInvitesOpen}
        restoreFocusRef={restoreFocusRef}
      />
    </DashboardShell>
  );
}
