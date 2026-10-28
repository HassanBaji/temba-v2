import { useUser } from "@clerk/expo";
import { RECENT_FORM_MATCH_COUNT } from "@repo/domain/home-recent-form";
import { homeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import { Screen } from "../primitives/screen";
import { api } from "../trpc/react";
import {
  levelFromApi,
  recentFormFromHistory,
  standingInSport,
  type HomeModel,
  type Slot,
} from "./home-model";
import { homePath, type HomeNavTarget } from "./home-target";
import { HomeView } from "./home-view";
import { upNextItems } from "./up-next-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const UP_NEXT_BOOKING_LIMIT = 20;

function slotOf<T, U>(
  query: {
    data: T | undefined;
    error: { message: string } | null;
    isLoading: boolean;
  },
  map: (data: T) => U,
): Slot<U> {
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  if (query.data === undefined || query.isLoading) {
    return { status: "loading" };
  }
  return { status: "ready", value: map(query.data) };
}

export function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [sport, setSport] = useState<Sport>(DEFAULT_SPORT);

  const home = api.users.home.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const bookings = api.bookings.listMine.useQuery(
    { scope: "upcoming", limit: UP_NEXT_BOOKING_LIMIT },
    REFETCH_ON_FOREGROUND,
  );
  const rating = api.ratings.me.useQuery({ sport }, REFETCH_ON_FOREGROUND);
  const history = api.games.listMyMatchHistory.useQuery(
    { limit: RECENT_FORM_MATCH_COUNT, sport },
    REFETCH_ON_FOREGROUND,
  );
  const createGroups = api.games.listCreateGroups.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );

  const nothingNext =
    home.data?.carouselGames.length === 0 && bookings.data?.items.length === 0;
  const padelVenues = api.bookings.listBookableVenues.useQuery(
    { sport: "padel" },
    { enabled: nothingNext },
  );
  const footballVenues = api.bookings.listBookableVenues.useQuery(
    { sport: "football" },
    { enabled: nothingNext },
  );

  const upNextSource = {
    data:
      home.data && bookings.data
        ? { games: home.data.carouselGames, bookings: bookings.data.items }
        : undefined,
    error: home.error ?? bookings.error,
    isLoading: home.isLoading || bookings.isLoading,
  };

  const model: HomeModel = {
    name: user?.fullName ?? user?.firstName ?? user?.username ?? "You",
    imageUri: user?.imageUrl ?? null,
    pendingInviteCount: home.data?.pendingInviteCount ?? 0,
    upNext: slotOf(upNextSource, (data) =>
      upNextItems(data.games, data.bookings),
    ),
    noGamesAction: homeNoGamesCreateAction({
      createGroupCount: createGroups.data?.length,
    }),
    venueCounts: {
      padel: padelVenues.data?.length ?? null,
      football: footballVenues.data?.length ?? null,
    },
    sport,
    level: slotOf(rating, levelFromApi),
    recentForm: slotOf(history, recentFormFromHistory),
    standing: slotOf(home, (data) => standingInSport(data.standing, sport)),
  };

  const refetchAll = useCallback(
    () =>
      Promise.all([
        home.refetch(),
        bookings.refetch(),
        rating.refetch(),
        history.refetch(),
        createGroups.refetch(),
      ]),
    [home, bookings, rating, history, createGroups],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  const onNavigate = useCallback(
    (target: HomeNavTarget) => router.push(homePath(target) as Href),
    [router],
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <HomeView
        model={model}
        onNavigate={onNavigate}
        onSport={setSport}
        onRetry={() => void refetchAll()}
      />
    </Screen>
  );
}
