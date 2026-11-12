import {
  addGroupPlayerIsFootball,
  removePlayerConfirmLine,
  removePlayerToast,
} from "@repo/domain/add-player-by-phone";
import type { GroupHomeData } from "@repo/domain/group-data";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import {
  DEFAULT_GROUP_PLAYED_FILTER,
  type GroupPlayedFilter,
} from "@repo/domain/group-played-filter";
import {
  GROUP_HISTORY_PAGE_SIZE,
  groupHistoryCanLoadMore,
  groupHistoryPageExhausted,
  groupLeaveConfirm,
  groupLeaveToast,
} from "@repo/domain/group-join";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import { groupHomeCanManageInvites } from "@repo/domain/group-home-cta";
import {
  groupLeaveBlockedHint,
  groupMenuItems,
  groupMenuRoleLine,
  groupOwnerLeaveCopy,
  type GroupMenuItem,
} from "@repo/domain/group-settings";
import { groupMemberOrganizerToast } from "@repo/domain/group-home-chrome";
import { ratingSettingsSummary } from "@repo/domain/group-rating-settings";
import {
  groupLeaveVenueConfirm,
  groupLeftVenueToast,
} from "@repo/domain/group-link-request";
import { groupLookupNote } from "@repo/domain/invites";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ScrollView, View } from "react-native";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { RenamePlayerSheet } from "../game-details/rename-player-sheet";
import {
  gamePath,
  registerRequest,
  seatJoinRequest,
  waitlistJoinRequest,
} from "../games/games-model";
import { useGameJoin } from "../games/use-game-join";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { apiOrigin } from "../lib/api-origin-runtime";
import { playerPath } from "../player-profile/player-path";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { GroupAddPlayerSheet } from "./group-add-player-sheet";
import { groupEditPath } from "./group-edit-model";
import { RequestJoinSheet } from "./request-join-sheet";
import { groupHomeHeader } from "./group-home-model";
import { GroupHomeView } from "./group-home-view";
import { groupRatingSettingsPath, groupTierHistoryPath } from "./groups-model";
import { Notice } from "./notice";
import { TransferOwnershipSheet } from "./transfer-ownership-sheet";
import {
  savedLevelFromParams,
  setGroupLevelPath,
  setLevelPath,
  type SavedLevelParams,
} from "./set-level-model";
import { useGroupAdmin } from "./use-group-admin";
import { useGroupInviteLink } from "./use-group-invite-link";
import { useGroupJoin } from "./use-group-join";
import { useGroupLinkRequest } from "./use-group-link-request";
import { useGroupTransfer } from "./use-group-transfer";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

type OlderPages = {
  source: GroupHomeData["gameHistory"];
  games: GroupHomeData["gameHistory"];
  exhausted: boolean;
};

const SCROLL_TARGET_INSET = 16;

export function GroupHomeScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams<SavedLevelParams>();
  const saved = savedLevelFromParams(params);
  const toast = useToast();
  const utils = api.useUtils();
  const [tab, setTab] = useState<GroupHomeTab>("standing");
  const [memberQuery, setMemberQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [pickerGame, setPickerGame] = useState<HubGameRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [renaming, setRenaming] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [older, setOlder] = useState<OlderPages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [playedFilter, setPlayedFilter] = useState<GroupPlayedFilter>(
    DEFAULT_GROUP_PLAYED_FILTER,
  );

  const group = api.groups.byId.useQuery(
    { id: groupId, gameHistory: { status: playedFilter } },
    {
      ...REFETCH_ON_FOREGROUND,
      placeholderData: (previous) =>
        previous?.id === groupId ? previous : undefined,
    },
  );
  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );
  const linkRequest = useGroupLinkRequest();
  const linkRequests = api.groups.pendingLinkRequests.useQuery(undefined, {
    enabled: (group.data?.pendingLinkRequestCount ?? 0) > 0,
  });
  const { join: joinGroup, pendingGroupId, requestSheet } = useGroupJoin();
  const { join: joinGame, pendingGameId } = useGameJoin();

  const leave = api.groups.leave.useMutation({
    onSuccess: async () => {
      toast.show(groupLeaveToast(locale));
      await Promise.all([
        utils.groups.byId.invalidate(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const unlinkFromVenue = api.groups.unlinkFromVenue.useMutation({
    onSuccess: async () => {
      toast.show(
        groupLeftVenueToast(
          group.data?.venue?.name ?? m.mobileGroup.theVenue,
          locale,
        ),
      );
      await Promise.all([
        utils.groups.byId.invalidate(),
        utils.groups.mine.invalidate(),
        utils.groups.mineLoose.invalidate(),
        utils.users.home.invalidate(),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const removePlayer = api.groups.removePlayer.useMutation({
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const setOrganizer = api.groups.setOrganizer.useMutation({
    onError: (error) => toast.show(error.message),
  });

  const refreshMembers = useCallback(
    () =>
      Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.listLookupInvites.invalidate({ groupId }),
      ]),
    [utils, groupId],
  );

  const data = group.data;
  const admin = useGroupAdmin(groupId, data);
  const inviteLink = useGroupInviteLink(
    groupId,
    Boolean(data?.canManageInviteLinks),
  );
  const transfer = useGroupTransfer(groupId, data?.name);
  const currentOlder =
    data && older?.source === data.gameHistory ? older : null;
  const playedGames = useMemo(
    () => (data ? [...data.gameHistory, ...(currentOlder?.games ?? [])] : []),
    [data, currentOlder],
  );

  const loadMoreHistory = useCallback(async () => {
    const last = playedGames.at(-1);
    if (!data || !last || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const next = await utils.groups.byId.fetch({
        id: groupId,
        gameHistory: {
          limit: GROUP_HISTORY_PAGE_SIZE,
          cursor: { id: last.id },
          status: playedFilter,
        },
      });
      setOlder({
        source: data.gameHistory,
        games: [...(currentOlder?.games ?? []), ...next.gameHistory],
        exhausted: groupHistoryPageExhausted(next.gameHistory.length),
      });
    } catch {
      setLoadMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [
    data,
    playedGames,
    loadingMore,
    utils,
    groupId,
    currentOlder,
    playedFilter,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([group.refetch(), admin.refetchRequests()]);
    } finally {
      setRefreshing(false);
    }
  }, [group, admin]);

  const openSetLevelScreen = useCallback(
    (userId: string) => router.push(setLevelPath(groupId, userId)),
    [router, groupId],
  );
  const openSetGroupLevelScreen = useCallback(
    (userId: string) => router.push(setGroupLevelPath(groupId, userId)),
    [router, groupId],
  );
  const dismissSaved = useCallback(
    () =>
      router.setParams({
        savedName: undefined,
        savedLevel: undefined,
        savedReason: undefined,
      }),
    [router],
  );
  const scrollRef = useRef<ScrollView>(null);
  const scrollTo = useCallback((target: View | null) => {
    const scroll = scrollRef.current;
    // React Native types the inner content node as `any`; it is a host node.
    const content = scroll?.getInnerViewNode() as number | null | undefined;
    if (!target || !scroll || content == null) {
      return;
    }
    target.measureLayout(content, (_x, y) =>
      scroll.scrollTo({
        y: Math.max(0, y - SCROLL_TARGET_INSET),
        animated: true,
      }),
    );
  }, []);

  const header = <ScreenHeader nav="back" fallback="/groups" />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.home.notFound} />
      </Screen>
    );
  }

  if (group.error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={m.mobileGroup.loadFailed.group}
          description={group.error.message}
          onRetry={() => void group.refetch()}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        {header}
        <Skeleton height={72} radius={16} />
        <Skeleton height={240} radius={16} />
      </Screen>
    );
  }

  const name = groupHomeHeader(data, apiOrigin, locale).name;
  const isMember = data.membership != null;
  const viewerEntry = data.standing.leaderboard.find((entry) => entry.isViewer);
  const askLeave = () =>
    setConfirm({
      ...groupLeaveConfirm(name, locale),
      onConfirm: () => leave.mutate({ groupId }),
    });
  const askOwnerLeave = () =>
    setConfirm({
      ...groupOwnerLeaveCopy(data.name, locale),
      onConfirm: () => {
        setConfirm(null);
        transfer.setOpen(true);
      },
    });
  const pickMenuItem = (item: GroupMenuItem) => {
    setMenuOpen(false);
    switch (item) {
      case "edit":
        router.push(groupEditPath(groupId));
        return;
      case "invite":
        setInviteOpen(true);
        return;
      case "copy_link":
        void inviteLink.copy();
        return;
      case "rating_settings":
        router.push(groupRatingSettingsPath(groupId));
        return;
      case "leave":
        if (data.isOwner && data.isLoose) {
          askOwnerLeave();
        } else {
          askLeave();
        }
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} scrollRef={scrollRef}>
      <GroupHomeView
        onScrollTo={scrollTo}
        data={data}
        apiOrigin={apiOrigin}
        tab={tab}
        onTabChange={setTab}
        joinPending={pendingGroupId === groupId}
        onJoin={(door) => joinGroup(groupId, door)}
        onInvite={() => setInviteOpen(true)}
        onAddPlayer={() => setAddPlayerOpen(true)}
        onRenameUnclaimed={setRenaming}
        onRemovePlayer={(member) =>
          setConfirm({
            title: m.group.addPlayer.removeAction,
            description: removePlayerConfirmLine(member.name, locale),
            confirmLabel: m.common.remove,
            onConfirm: () =>
              removePlayer.mutate(
                { groupId, userId: member.userId },
                {
                  onSuccess: () => {
                    toast.show(removePlayerToast(member.name, locale));
                    void utils.groups.byId.invalidate({ id: groupId });
                  },
                },
              ),
          })
        }
        onOrganizerAction={(member, action) =>
          setOrganizer.mutate(
            {
              groupId,
              userId: member.userId,
              organizer: action === "appoint",
            },
            {
              onSuccess: () => {
                toast.show(
                  groupMemberOrganizerToast(action, member.name, locale),
                );
                void utils.groups.byId.invalidate({ id: groupId });
              },
            },
          )
        }
        menu={{
          visible: menuOpen,
          items: groupMenuItems({
            isMember,
            canEdit: data.canEdit,
            canInvite: groupHomeCanManageInvites(data),
            canCopyLink: data.canManageInviteLinks,
            canChangeRatingSettings: data.ratingSettings != null,
          }),
          roleLine: groupMenuRoleLine({
            isOwner: data.isOwner,
            isOrganizer: viewerEntry?.isOrganizer ?? false,
            isMember,
            locale,
          }),
          leaveBlockedHint: groupLeaveBlockedHint({
            isOwner: data.isOwner,
            isLoose: data.isLoose,
            locale,
          }),
          ratingSettingsHint: data.ratingSettings
            ? ratingSettingsSummary(data.ratingSettings, locale)
            : null,
          copyPending: inviteLink.copyPending,
          onOpen: () => setMenuOpen(true),
          onPick: pickMenuItem,
          onClose: () => setMenuOpen(false),
        }}
        onLeaveVenue={() => {
          const copy = groupLeaveVenueConfirm(
            name,
            data.venue?.name ?? m.mobileGroup.theVenue,
            locale,
          );
          setConfirm({
            title: copy.title,
            description: copy.description,
            details: copy.consequences,
            confirmLabel: copy.confirmLabel,
            cancelLabel: copy.cancelLabel,
            onConfirm: () => unlinkFromVenue.mutate({ groupId }),
          });
        }}
        admin={{ approver: admin.approver }}
        venueRequests={(linkRequests.data ?? []).filter(
          (request) => request.groupId === groupId,
        )}
        venueRequestPendingId={linkRequest.pendingRequestId}
        onAcceptVenueRequest={linkRequest.askAccept}
        onDeclineVenueRequest={linkRequest.askDecline}
        confirm={linkRequest.confirm ?? confirm}
        confirmPending={
          leave.isPending ||
          unlinkFromVenue.isPending ||
          removePlayer.isPending ||
          linkRequest.confirmPending
        }
        onCloseConfirm={() => {
          setConfirm(null);
          linkRequest.closeConfirm();
        }}
        memberQuery={memberQuery}
        onMemberQueryChange={setMemberQuery}
        pendingInviteNames={
          data.canManageLookupInvites
            ? (lookupInvites.data ?? []).map((invite) => invite.user.name)
            : []
        }
        onOpenMember={(userId) => router.push(playerPath(segments, userId))}
        onSetLevel={openSetLevelScreen}
        onSetGroupLevel={openSetGroupLevelScreen}
        onOpenTierHistory={(userId) =>
          router.push(groupTierHistoryPath(groupId, userId))
        }
        saved={saved}
        onDismissSaved={dismissSaved}
        games={{
          playedGames,
          playedCounts: data.gameHistoryCounts,
          playedFilter,
          onPlayedFilterChange: (filter) => {
            setLoadMoreFailed(false);
            setPlayedFilter(filter);
          },
          filtering: group.isPlaceholderData,
          pendingGameId,
          canLoadMore:
            !group.isPlaceholderData &&
            groupHistoryCanLoadMore({
              loadedCount: playedGames.length,
              exhausted: currentOlder?.exhausted ?? false,
            }),
          loadingMore,
          loadMoreFailed,
          onPickSeat: setPickerGame,
          onLoadMore: () => void loadMoreHistory(),
        }}
        pickerGame={pickerGame}
        onClosePicker={() => setPickerGame(null)}
        onPickSeat={(gameId, sideIndex, position) =>
          joinGame(seatJoinRequest(gameId, sideIndex, position))
        }
        actions={{
          onOpen: (gameId) => router.push(gamePath(gameId)),
          onJoinSeat: (gameId, sideIndex, position) =>
            joinGame(seatJoinRequest(gameId, sideIndex, position)),
          onJoinWaitlist: (game) => joinGame(waitlistJoinRequest(game)),
          onRegister: (gameId) => joinGame(registerRequest(gameId)),
        }}
      />
      <RequestJoinSheet {...requestSheet} />
      {data.canTransferOwnership ? (
        <TransferOwnershipSheet
          visible={transfer.open}
          groupName={data.name}
          members={data.standing.leaderboard}
          apiOrigin={apiOrigin}
          pending={transfer.pending}
          onTransfer={transfer.transfer}
          onClose={() => transfer.setOpen(false)}
        />
      ) : null}
      {data.canAddPlayers ? (
        <RenamePlayerSheet
          player={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
      {data.canAddPlayers ? (
        <GroupAddPlayerSheet
          visible={addPlayerOpen}
          onClose={() => setAddPlayerOpen(false)}
          groupId={groupId}
          isFootball={addGroupPlayerIsFootball(data.sport)}
          onDone={refreshMembers}
        />
      ) : null}
      {groupHomeCanManageInvites(data) ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "group",
            groupId,
            name: data.name,
            sport: data.sport,
            note: groupLookupNote(locale),
            canLookup: data.canManageLookupInvites,
            canLink: data.canManageInviteLinks,
          }}
        />
      ) : null}
    </Screen>
  );
}
