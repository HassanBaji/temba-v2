import type { HubGameRow, HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
} from "@repo/domain/match-history-card";
import type { SportFilter } from "@repo/domain/football-hub";
import { gamesHubTabFromQuery } from "@repo/domain/games-hub-tab";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import type { Slot } from "../home/home-model";
import { slotOf } from "../lib/slot-of";
import {
  footballJoinPath,
  footballScorePath,
  gamePath,
  registerRequest,
  seatJoinRequest,
  waitlistJoinRequest,
  type GamesTab,
} from "./games-model";
import { GamesView } from "./games-view";
import { useGameJoin } from "./use-game-join";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function GamesScreen() {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const utils = api.useUtils();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<GamesTab>(gamesHubTabFromQuery(params.tab));
  useEffect(() => {
    if (params.tab) {
      setTab(gamesHubTabFromQuery(params.tab));
    }
  }, [params.tab]);
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");
  const [pickerGame, setPickerGame] = useState<HubGameRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const myGames = api.games.listMyGames.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const publicGames = api.games.listPublicPickup.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const history = api.games.listMyMatchHistory.useInfiniteQuery(
    { limit: HISTORY_PAGE_SIZE },
    { ...REFETCH_ON_FOREGROUND, getNextPageParam: nextHistoryCursor },
  );
  const historyRows = useMemo(() => history.data?.pages.flat(), [history.data]);

  const { join, pendingGameId } = useGameJoin();
  const confirmScore = api.games.confirmMatchResult.useMutation({
    onSuccess: () => toast.show(m.mobileTournament.games.scoreConfirmed),
    onError: (error) => toast.show(error.message),
    onSettled: () =>
      Promise.all([
        utils.games.listMyGames.invalidate(),
        utils.games.listPublicPickup.invalidate(),
      ]),
  });
  const confirmingGameId = confirmScore.isPending
    ? (confirmScore.variables?.gameId ?? null)
    : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        myGames.refetch(),
        publicGames.refetch(),
        history.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [myGames, publicGames, history]);

  const loadMore = useCallback(() => {
    if (history.hasNextPage && !history.isFetchingNextPage) {
      void history.fetchNextPage();
    }
  }, [history]);

  const historySlot: Slot<HubHistoryRow[]> = slotOf({
    data: historyRows,
    error: history.data ? null : history.error,
    isLoading: history.isLoading,
  });

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      onNearEnd={tab === "history" ? loadMore : undefined}
    >
      <GamesView
        tab={tab}
        onTabChange={setTab}
        myGames={slotOf(myGames)}
        publicGames={slotOf(publicGames)}
        history={historySlot}
        historyHasMore={history.hasNextPage}
        historyLoadingMore={history.isFetchingNextPage}
        historyLoadMoreFailed={
          history.isFetchNextPageError ? history.error.message : null
        }
        pendingGameId={pendingGameId ?? confirmingGameId}
        pickerGame={pickerGame}
        onOpenPicker={setPickerGame}
        onOpen={(gameId) => router.push(gamePath(gameId))}
        onJoinSeat={(gameId, sideIndex, position) =>
          join(seatJoinRequest(gameId, sideIndex, position))
        }
        onJoinWaitlist={(game) => join(waitlistJoinRequest(game))}
        onRegister={(gameId) => join(registerRequest(gameId))}
        sportFilter={sportFilter}
        onSportFilterChange={setSportFilter}
        football={{
          onJoin: (gameId) => router.push(footballJoinPath(gameId)),
          onEnterScore: (gameId) => router.push(footballScorePath(gameId)),
          onConfirm: (gameId, matchId) =>
            confirmScore.mutate({ gameId, matchId }),
        }}
        onLoadMore={loadMore}
        onCreate={() => router.push("/games/new")}
        onFindGroup={() =>
          router.push({ pathname: "/groups", params: { tab: "public" } })
        }
        onRetry={() => void onRefresh()}
      />
    </Screen>
  );
}
