import { PLAYER_PROFILE_REFUSED } from "@repo/domain/player-profile";
import { useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";

import { Card } from "../home/card";
import { Notice } from "../groups/notice";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Hairline } from "../primitives/hairline";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { PlayerMatchRow } from "./match-row";
import { playerProfileState } from "./player-profile-model";

const FALLBACK: Href = "/";

export function PlayerMatchesScreen({ userId }: { userId: string }) {
  const query = api.users.playerProfile.useQuery({ userId });
  const state = playerProfileState(query, apiOrigin);
  const header = (
    <ScreenHeader nav="back" fallback={FALLBACK} title="Last 10 games" />
  );

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
      <Screen>
        {header}
        <Notice
          alert
          title="Games could not be loaded"
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
        <Skeleton height={320} radius={16} />
      </Screen>
    );
  }

  const { model } = state;
  return (
    <Screen>
      {header}
      <Text size="meta" tone="muted">
        {`${model.name}, ${model.lastTen.record}`}
      </Text>
      <Card>
        {model.matches.map((row, index) => (
          <View key={row.matchId}>
            {index > 0 ? <Hairline /> : null}
            <PlayerMatchRow row={row} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

export function PlayerMatchesRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <PlayerMatchesScreen userId={userId} />;
}
