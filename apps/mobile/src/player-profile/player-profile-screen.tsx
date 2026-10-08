import { PLAYER_PROFILE_REFUSED } from "@repo/domain/player-profile";
import { useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useState } from "react";

import { Notice } from "../groups/notice";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { api } from "../trpc/react";
import { playerProfileState } from "./player-profile-model";
import { PlayerProfileView } from "./player-profile-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const FALLBACK: Href = "/";

export function PlayerProfileScreen({ userId }: { userId: string }) {
  const [refreshing, setRefreshing] = useState(false);
  const query = api.users.playerProfile.useQuery(
    { userId },
    REFETCH_ON_FOREGROUND,
  );
  const state = playerProfileState(query, apiOrigin);

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

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PlayerProfileView model={state.model} fallback={FALLBACK} />
    </Screen>
  );
}

export function PlayerProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <PlayerProfileScreen userId={userId} />;
}
