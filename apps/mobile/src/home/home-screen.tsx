import { useUser } from "@clerk/expo";
import { RECENT_FORM_MATCH_COUNT } from "@repo/domain/home-recent-form";
import { homeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { Link, useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";

import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import {
  homeContentFromApi,
  levelFromApi,
  recentFormFromHistory,
  type HomeModel,
  type Slot,
} from "./home-model";
import { homePath, type HomeNavTarget } from "./home-target";
import { HomeView } from "./home-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

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

  const hasCreateAccess = user?.publicMetadata.groupCreator === true;
  const home = api.users.home.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const rating = api.ratings.me.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const history = api.games.listMyMatchHistory.useQuery(
    { limit: RECENT_FORM_MATCH_COUNT },
    REFETCH_ON_FOREGROUND,
  );
  const createGroups = api.games.listCreateGroups.useQuery(undefined, {
    ...REFETCH_ON_FOREGROUND,
    enabled: hasCreateAccess,
  });

  const noGamesAction = homeNoGamesCreateAction({
    hasCreateAccess,
    createGroupCount: createGroups.data?.length,
  });

  const model: HomeModel = {
    name: user?.fullName ?? user?.firstName ?? user?.username ?? "You",
    imageUri: user?.imageUrl ?? null,
    home: slotOf(home, (data) => homeContentFromApi(data, noGamesAction)),
    level: slotOf(rating, levelFromApi),
    recentForm: slotOf(history, recentFormFromHistory),
  };

  const refetchAll = useCallback(
    () =>
      Promise.all([
        home.refetch(),
        rating.refetch(),
        history.refetch(),
        hasCreateAccess ? createGroups.refetch() : Promise.resolve(),
      ]),
    [home, rating, history, createGroups, hasCreateAccess],
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
        onRetry={() => void refetchAll()}
      />
      {__DEV__ ? (
        <>
          <Link href="/gallery">
            <Text size="meta" weight="medium">
              Open the primitives gallery
            </Text>
          </Link>
          <Link href="/gallery-home">
            <Text size="meta" weight="medium">
              Open the Home states gallery
            </Text>
          </Link>
        </>
      ) : null}
    </Screen>
  );
}
