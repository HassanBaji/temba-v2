import {
  REMOVE_UNCLAIMED_PLAYER_ACTION,
  addGroupPlayerIsFootball,
  removeUnclaimedPlayerConfirmLine,
  removeUnclaimedPlayerToast,
} from "@repo/domain/add-player-by-phone";
import type { GroupHomeData } from "@repo/domain/group-data";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import {
  GROUP_HISTORY_PAGE_SIZE,
  groupHistoryCanLoadMore,
  groupHistoryPageExhausted,
  groupLeaveConfirm,
  groupLeaveToast,
} from "@repo/domain/group-join";
import type { HubGameRow } from "@repo/domain/hub-game-row";
import {
  groupDeleteConfirm,
  groupRemoveImageConfirm,
} from "@repo/domain/group-admin";
import { groupHomeCanManageInvites } from "@repo/domain/group-home-cta";
import { groupMemberOrganizerToast } from "@repo/domain/group-home-chrome";
import {
  groupLeaveVenueConfirm,
  groupLeftVenueToast,
} from "@repo/domain/group-link-request";
import { groupLookupNote } from "@repo/domain/invites";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { RenamePlayerSheet } from "../game-details/rename-player-sheet";
import {
  gamePath,
  registerRequest,
  seatJoinRequest,
  waitlistJoinRequest,
} from "../games/games-model";
import { useGameJoin } from "../games/use-game-join";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { apiOrigin } from "../lib/api-origin-runtime";
import { playerPath } from "../player-profile/player-path";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { GroupAddPlayerSheet } from "./group-add-player-sheet";
import { groupHomeHeader } from "./group-home-model";
import { GroupHomeView } from "./group-home-view";
import { Notice } from "./notice";
import {
  savedLevelFromParams,
  setLevelPath,
  type SavedLevelParams,
} from "./set-level-model";
import { useGroupAdmin } from "./use-group-admin";
import { useGroupJoin } from "./use-group-join";
import { useGroupLinkRequest } from "./use-group-link-request";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

type OlderPages = {
  source: GroupHomeData["gameHistory"];
  games: GroupHomeData["gameHistory"];
  exhausted: boolean;
};

export function GroupHomeScreen({ groupId }: { groupId: string }) {
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
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [renaming, setRenaming] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [older, setOlder] = useState<OlderPages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  const group = api.groups.byId.useQuery(
    { id: groupId },
    REFETCH_ON_FOREGROUND,
  );
  const lookupInvites = api.groups.listLookupInvites.useQuery(
    { groupId },
    { enabled: Boolean(group.data?.canManageLookupInvites) },
  );
  const linkRequest = useGroupLinkRequest();
  const linkRequests = api.groups.pendingLinkRequests.useQuery(undefined, {
    enabled: (group.data?.pendingLinkRequestCount ?? 0) > 0,
  });
  const { join: joinGroup, pendingGroupId } = useGroupJoin();
  const { join: joinGame, pendingGameId } = useGameJoin();

  const leave = api.groups.leave.useMutation({
    onSuccess: async (result) => {
      toast.show(groupLeaveToast(result.communityId));
      await Promise.all([
        utils.groups.byId.invalidate(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
        utils.communities.mine.invalidate(),
        utils.communities.byId.invalidate(),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const unlinkFromVenue = api.groups.unlinkFromVenue.useMutation({
    onSuccess: async () => {
      toast.show(
        groupLeftVenueToast(
          group.data?.venueCommunity?.venueName ?? "the Venue",
        ),
      );
      await Promise.all([
        utils.groups.byId.invalidate(),
        utils.groups.mine.invalidate(),
        utils.groups.mineLoose.invalidate(),
        utils.users.home.invalidate(),
        utils.communities.mine.invalidate(),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const removeUnclaimedPlayer = api.groups.removeUnclaimedPlayer.useMutation({
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
        utils.communities.byId.invalidate(),
      ]),
    [utils, groupId],
  );

  const data = group.data;
  const admin = useGroupAdmin(groupId, data, () => {
    setConfirm(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/groups");
    }
  });
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
  }, [data, playedGames, loadingMore, utils, groupId, currentOlder]);

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
  const dismissSaved = useCallback(
    () =>
      router.setParams({
        savedName: undefined,
        savedLevel: undefined,
        savedReason: undefined,
      }),
    [router],
  );

  const header = <ScreenHeader nav="back" fallback="/groups" />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice
          title="Group not found"
          description="It may have been removed, or you may not have access."
        />
      </Screen>
    );
  }

  if (group.error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title="Group could not be loaded"
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

  const name = groupHomeHeader(data, apiOrigin).name;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <GroupHomeView
        data={data}
        apiOrigin={apiOrigin}
        tab={tab}
        onTabChange={setTab}
        joinPending={pendingGroupId === groupId}
        onJoin={(door) => joinGroup(groupId, door)}
        onInvite={() => setInviteOpen(true)}
        onAddPlayer={() => setAddPlayerOpen(true)}
        onRenameUnclaimed={setRenaming}
        onRemoveUnclaimed={(member) =>
          setConfirm({
            title: REMOVE_UNCLAIMED_PLAYER_ACTION,
            description: removeUnclaimedPlayerConfirmLine(member.name),
            confirmLabel: "Remove",
            onConfirm: () =>
              removeUnclaimedPlayer.mutate(
                { groupId, userId: member.userId },
                {
                  onSuccess: () => {
                    toast.show(removeUnclaimedPlayerToast(member.name));
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
                toast.show(groupMemberOrganizerToast(action, member.name));
                void utils.groups.byId.invalidate({ id: groupId });
              },
            },
          )
        }
        onLeave={() =>
          setConfirm({
            ...groupLeaveConfirm(name),
            onConfirm: () => leave.mutate({ groupId }),
          })
        }
        onLeaveVenue={() => {
          const copy = groupLeaveVenueConfirm(
            name,
            data.venueCommunity?.venueName ?? "the Venue",
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
        admin={{
          approver: admin.approver,
          imagePending: admin.imagePending,
          onChangeImage: () => void admin.changeImage(),
          onRemoveImage: () =>
            setConfirm({
              ...groupRemoveImageConfirm(name),
              onConfirm: () => {
                setConfirm(null);
                admin.clearImage();
              },
            }),
          onDelete: () =>
            setConfirm({
              ...groupDeleteConfirm(name),
              onConfirm: admin.deleteGroup,
            }),
        }}
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
          removeUnclaimedPlayer.isPending ||
          admin.deletePending ||
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
        saved={saved}
        onDismissSaved={dismissSaved}
        games={{
          playedGames,
          pendingGameId,
          canLoadMore: groupHistoryCanLoadMore({
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
            note: groupLookupNote(data.isLoose),
            canLookup: data.canManageLookupInvites,
            canLink: data.canManageInviteLinks,
          }}
        />
      ) : null}
    </Screen>
  );
}
