import { useUser } from "@clerk/expo";
import type { HubGameRow, HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
} from "@repo/domain/match-history-card";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { Screen } from "../primitives/screen";
import { api } from "../trpc/react";
import type { Slot } from "../home/home-model";
import { slotOf } from "../lib/slot-of";
import {
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
  const { user } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<GamesTab>("my-games");
  const [pickerGame, setPickerGame] = useState<HubGameRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasCreateAccess = user?.publicMetadata.groupCreator === true;

  const myGames = api.games.listMyGames.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const history = api.games.listMyMatchHistory.useInfiniteQuery(
    { limit: HISTORY_PAGE_SIZE },
    { ...REFETCH_ON_FOREGROUND, getNextPageParam: nextHistoryCursor },
  );
  const historyRows = useMemo(() => history.data?.pages.flat(), [history.data]);

  const { join, pendingGameId } = useGameJoin();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([myGames.refetch(), history.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [myGames, history]);

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
        history={historySlot}
        historyHasMore={history.hasNextPage}
        historyLoadingMore={history.isFetchingNextPage}
        historyLoadMoreFailed={
          history.isFetchNextPageError ? history.error.message : null
        }
        pendingGameId={pendingGameId}
        pickerGame={pickerGame}
        hasCreateAccess={hasCreateAccess}
        onOpenPicker={setPickerGame}
        onOpen={(gameId) => router.push(gamePath(gameId))}
        onJoinSeat={(gameId, sideIndex, position) =>
          join(seatJoinRequest(gameId, sideIndex, position))
        }
        onJoinWaitlist={(game) => join(waitlistJoinRequest(game))}
        onRegister={(gameId) => join(registerRequest(gameId))}
        onLoadMore={loadMore}
        onCreate={() => router.push("/games/new")}
        onRetry={() => void onRefresh()}
      />
    </Screen>
  );
}
