"use client";

import { notFound, usePathname, useRouter } from "next/navigation";
import { use, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GroupGamesTab } from "~/components/groups/group-games-tab";
import { GroupHomeChrome } from "~/components/groups/group-home-chrome";
import { GroupHomeOverflowMenu } from "~/components/groups/group-home-overflow-menu";
import { GroupHomeSkeleton } from "~/components/groups/group-home-skeleton";
import { GroupApproverControls } from "~/components/groups/group-join-requests-section";
import { GroupMembersTab } from "~/components/groups/group-members-tab";
import { GroupStandingTab } from "~/components/groups/group-standing-tab";
import { InvitesDialog } from "~/components/invites/invites-dialog";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { gameJoinToast } from "@repo/domain/game-copy";
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
  GROUP_REQUEST_APPROVED_TOAST,
  GROUP_REQUEST_REJECTED_TOAST,
  groupDeleteConfirm,
  groupRemoveImageConfirm,
} from "@repo/domain/group-admin";
import { groupInviteClipboardText } from "@repo/domain/group-invite-share-message";
import { groupLookupNote, lookupInviteSentToast } from "@repo/domain/invites";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { api, type RouterOutputs } from "~/trpc/react";

type ScheduledGame = RouterOutputs["groups"]["byId"]["upcomingGames"][number];

export default function GroupHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = groupHomeTabFromQuery(tabParam);
  const { hasCreateAccess } = useCreateAccess();
  const router = useRouter();
  const pathname = usePathname() ?? `/dashboard/groups/${id}`;
  const utils = api.useUtils();
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeImageOpen, setRemoveImageOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupRefused, setLookupRefused] = useState<
    { name: string; message: string }[] | null
  >(null);
  const [restoreFocus, setRestoreFocus] = useState<"mobile" | "desktop">(
    "desktop",
  );

  const group = api.groups.byId.useQuery({ id });

  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );
  const lookupSearch = api.groups.searchLookupUsers.useQuery(
    { groupId: id, query: lookupQuery },
    {
      enabled: invitesOpen && Boolean(group.data?.canManageLookupInvites),
    },
  );

  const inviteLink = api.groups.getInviteLink.useQuery(
    { groupId: id },
    { enabled: Boolean(group.data?.canManageInviteLinks) },
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

  const approveJoinRequest = api.groups.approveJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success(GROUP_REQUEST_APPROVED_TOAST);
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
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectJoinRequest = api.groups.rejectJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success(GROUP_REQUEST_REJECTED_TOAST);
      await Promise.all([
        utils.groups.byId.invalidate({ id }),
        utils.groups.mine.invalidate(),
        utils.groups.listJoinRequests.invalidate({ groupId: id }),
      ]);
    },
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

  const createInviteLink = api.groups.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await utils.groups.getInviteLink.invalidate({ groupId: id });
      await navigator.clipboard.writeText(
        groupInviteClipboardText({
          groupName: group.data?.name,
          sport: group.data?.sport,
          inviteUrl: result.shortUrl ?? result.inviteUrl,
        }),
      );
      toast.success("Invite link copied");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendLookupInvite = api.groups.sendLookupInvite.useMutation({
    onSuccess: async (result) => {
      setLookupRefused(result.refused);
      if (result.sent.length > 0) {
        toast.success(lookupInviteSentToast(result.sent.length));
      }
      await utils.groups.listLookupInvites.invalidate({ groupId: id });
      await utils.groups.searchLookupUsers.invalidate({ groupId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
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
    router.replace(`${pathname}${groupHomeTabQuery(resolved)}`, {
      scroll: false,
    });
  }

  function onJoin() {
    const door = group.data ? groupHomeJoinDoor(group.data) : null;
    if (door === "requestJoin") {
      requestJoin.mutate({ groupId: id });
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
  const canShowCreateGame = groupHomeCanShowCreateGame({
    hasCreateAccess,
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
    hasCreateAccess,
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
  });
  const leaveConfirm = groupLeaveConfirm(groupName);
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

          <TabsContent value="standing">
            <GroupStandingTab
              isMember={Boolean(data.membership)}
              leaderboard={data.standing.leaderboard}
              groupId={id}
              canShowCreateGame={canShowCreateGame}
              totalGamesPlayed={data.totalGamesPlayed}
              awaitingScoreCount={data.standing.awaitingScoreCount}
            />
          </TabsContent>
          <TabsContent value="games">
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
            />
          </TabsContent>
          <TabsContent value="members">
            <div className="flex flex-col gap-[26px]">
              <GroupApproverControls
                canSetRequiresApproval={data.canSetRequiresApproval}
                requiresApproval={data.requiresApproval}
                requiresApprovalPending={setRequiresApproval.isPending}
                onRequiresApprovalChange={(next) =>
                  setRequiresApproval.mutate({
                    groupId: id,
                    requiresApproval: next,
                  })
                }
                canDecideJoinRequests={data.canDecideJoinRequests}
                joinRequests={joinRequests.data}
                joinLoading={joinRequests.isLoading}
                joinError={joinRequests.error?.message}
                onRetryJoin={() => {
                  void joinRequests.refetch();
                }}
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
                onApprove={(requestId) =>
                  approveJoinRequest.mutate({ requestId })
                }
                onReject={(requestId) =>
                  rejectJoinRequest.mutate({ requestId })
                }
                communityName={data.community?.name ?? null}
              />
              <GroupMembersTab
                members={data.standing.leaderboard.map((entry) => ({
                  userId: entry.userId,
                  name: entry.name ?? "Member",
                  image: entry.image,
                  isViewer: entry.isViewer,
                  isOrganizer: entry.isOrganizer,
                  joinedAt: entry.joinedAt,
                  formMarks: entry.formMarks,
                  levelBand: entry.levelBand,
                  levelProvisional: entry.levelProvisional,
                  level: entry.level,
                }))}
                canInvite={canManageInvites}
                onInvite={() => setInvitesOpen(true)}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

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

      <InvitesDialog
        open={invitesOpen}
        onOpenChange={(next) => {
          setInvitesOpen(next);
          if (!next) {
            setLookupQuery("");
            setLookupRefused(null);
          }
        }}
        restoreFocusRef={restoreFocusRef}
        lookup={
          data.canManageLookupInvites
            ? {
                note: groupLookupNote(data.isLoose),
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
                  sendLookupInvite.mutate({ groupId: id, userIds }),
                onRevokeLookup: (inviteId) =>
                  revokeLookupInvite.mutate({ inviteId }),
              }
            : null
        }
        link={
          data.canManageInviteLinks
            ? {
                inviteUrl:
                  inviteLink.data?.shortUrl ?? inviteLink.data?.inviteUrl,
                copyPending: createInviteLink.isPending,
                onCopy: () => createInviteLink.mutate({ groupId: id }),
              }
            : null
        }
      />
    </DashboardShell>
  );
}
