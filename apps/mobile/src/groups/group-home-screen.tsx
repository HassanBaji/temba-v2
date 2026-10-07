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
import { groupLookupNote } from "@repo/domain/invites";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import {
  gamePath,
  registerRequest,
  seatJoinRequest,
  waitlistJoinRequest,
} from "../games/games-model";
import { useGameJoin } from "../games/use-game-join";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { groupHomeHeader } from "./group-home-model";
import { GroupHomeView } from "./group-home-view";
import { Notice } from "./notice";
import { useGroupAdmin } from "./use-group-admin";
import { useGroupJoin } from "./use-group-join";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

type OlderPages = {
  source: GroupHomeData["gameHistory"];
  games: GroupHomeData["gameHistory"];
  exhausted: boolean;
};

export function GroupHomeScreen({ groupId }: { groupId: string }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [tab, setTab] = useState<GroupHomeTab>("standing");
  const [memberQuery, setMemberQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [pickerGame, setPickerGame] = useState<HubGameRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [older, setOlder] = useState<OlderPages | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  const group = api.groups.byId.useQuery(
    { id: groupId },
    REFETCH_ON_FOREGROUND,
  );
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

  const openSetLevelScreen = useCallback(() => undefined, []);

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
        onLeave={() =>
          setConfirm({
            ...groupLeaveConfirm(name),
            onConfirm: () => leave.mutate({ groupId }),
          })
        }
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
        confirm={confirm}
        confirmPending={leave.isPending || admin.deletePending}
        onCloseConfirm={() => setConfirm(null)}
        memberQuery={memberQuery}
        onMemberQueryChange={setMemberQuery}
        onSetLevel={openSetLevelScreen}
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
