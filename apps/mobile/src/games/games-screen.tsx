import { useUser } from "@clerk/expo";
import { gameJoinToast } from "@repo/domain/game-copy";
import { hubRegisterToast } from "@repo/domain/game-card";
import type { HubGameRow, HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  HISTORY_PAGE_SIZE,
  nextHistoryCursor,
} from "@repo/domain/match-history-card";
import { Link, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import type { Slot } from "../home/home-model";
import {
  gamePath,
  registerRequest,
  seatJoinRequest,
  waitlistJoinRequest,
  type GamesTab,
  type JoinRequest,
} from "./games-model";
import { GamesView } from "./games-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

function slotOf<T>(query: {
  data: T | undefined;
  error: { message: string } | null;
  isLoading: boolean;
}): Slot<T> {
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  if (query.data === undefined || query.isLoading) {
    return { status: "loading" };
  }
  return { status: "ready", value: query.data };
}

export function GamesScreen() {
  const { user } = useUser();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
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

  const refreshLists = useCallback(
    () =>
      Promise.all([
        utils.games.listMyGames.invalidate(),
        utils.games.listMyMatchHistory.invalidate(),
        utils.users.home.invalidate(),
        utils.games.byId.invalidate(),
      ]),
    [utils],
  );

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: (result) => {
      toast.show(gameJoinToast(result.waitlisted));
    },
    onError: (error) => toast.show(error.message),
    onSettled: refreshLists,
  });
  const register = api.games.register.useMutation({
    onSuccess: (result) => {
      toast.show(hubRegisterToast(result.waitlisted));
    },
    onError: (error) => toast.show(error.message),
    onSettled: refreshLists,
  });

  const pendingGameId =
    (registerSeat.isPending ? registerSeat.variables?.gameId : null) ??
    (register.isPending ? register.variables?.gameId : null) ??
    null;

  const join = useCallback(
    (request: JoinRequest) => {
      if (request.door === "register") {
        register.mutate(request.input);
      } else {
        registerSeat.mutate(request.input);
      }
    },
    [register, registerSeat],
  );

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
      {__DEV__ ? (
        <Link href="/gallery-games">
          <Text size="meta" weight="medium">
            Open the Games states gallery
          </Text>
        </Link>
      ) : null}
    </Screen>
  );
}
