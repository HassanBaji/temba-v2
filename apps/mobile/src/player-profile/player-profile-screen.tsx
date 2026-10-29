import {
  PLAYER_PROFILE_REFUSED,
  profileSport,
} from "@repo/domain/player-profile";
import type { Sport } from "@repo/domain/sport";
import {
  useLocalSearchParams,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import { useCallback, useState } from "react";

import { gamePath } from "../games/games-model";
import { Notice } from "../groups/notice";
import { apiOrigin } from "../lib/api-origin-runtime";
import { SportSegments } from "../lib/sport-segments";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { api } from "../trpc/react";
import { playerMatchesPath } from "./player-path";
import {
  footballProfileState,
  playerProfileState,
} from "./player-profile-model";
import { FootballProfileView, PlayerProfileView } from "./player-profile-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const FALLBACK: Href = "/";

export function PlayerProfileScreen({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: string;
}) {
  const router = useRouter();
  const segments = useSegments();
  const [refreshing, setRefreshing] = useState(false);
  const [chosen, setChosen] = useState<Sport | null>(null);
  const padelQuery = api.users.playerProfile.useQuery(
    { userId },
    REFETCH_ON_FOREGROUND,
  );
  const sport = chosen ?? profileSport(requestedSport, padelQuery.data?.sports);
  const footballQuery = api.users.footballProfile.useQuery(
    { userId },
    { ...REFETCH_ON_FOREGROUND, enabled: sport === "football" },
  );
  const query = sport === "football" ? footballQuery : padelQuery;
  const padelState = playerProfileState(padelQuery, apiOrigin);
  const footballState = footballProfileState(footballQuery, apiOrigin);
  const state = sport === "football" ? footballState : padelState;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const header = <ScreenHeader nav="back" fallback={FALLBACK} />;

  if (state.status === "refused") {
    return (
      <Screen>
        {header}
        <Notice {...PLAYER_PROFILE_REFUSED} />
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title="Profile could not be loaded"
          description={state.message}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  if (state.status === "loading") {
    return (
      <Screen>
        {header}
        <Skeleton height={280} radius={16} />
        <Skeleton height={180} radius={16} />
      </Screen>
    );
  }

  const switcher = sport ? (
    <SportSegments value={sport} onSelect={setChosen} />
  ) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {sport === "football" && footballState.status === "ready" ? (
        <FootballProfileView
          model={footballState.model}
          fallback={FALLBACK}
          switcher={switcher}
          onOpenGame={(gameId) => router.push(gamePath(gameId))}
        />
      ) : padelState.status === "ready" ? (
        <PlayerProfileView
          model={padelState.model}
          fallback={FALLBACK}
          switcher={switcher}
          onOpenMatch={(matchId) =>
            router.push(playerMatchesPath(segments, userId, matchId))
          }
          onSeeAll={() => router.push(playerMatchesPath(segments, userId))}
        />
      ) : null}
    </Screen>
  );
}

export function PlayerProfileRoute() {
  const { userId, sport } = useLocalSearchParams<{
    userId: string;
    sport?: string;
  }>();
  return <PlayerProfileScreen userId={userId} requestedSport={sport} />;
}
