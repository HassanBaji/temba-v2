import { spacing } from "@repo/design-tokens";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { PLAYER_PROFILE_REFUSED } from "@repo/domain/player-profile";
import type { LastTenFilter } from "@repo/domain/player-profile-matches";
import {
  useLocalSearchParams,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { ChipGrid } from "../create-game/chips";
import { gamePath } from "../games/games-model";
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
import { PlayerMatchSheet } from "./match-sheet";
import { playerMatchesModel } from "./player-matches-model";
import { playerPath } from "./player-path";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const FALLBACK: Href = "/";

export function PlayerMatchesScreen({
  userId,
  initialMatchId,
}: {
  userId: string;
  initialMatchId: string | null;
}) {
  const router = useRouter();
  const segments = useSegments();
  const [filter, setFilter] = useState<LastTenFilter>("all");
  const [openMatchId, setOpenMatchId] = useState(initialMatchId);
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatchId);
  const [refreshing, setRefreshing] = useState(false);
  const query = api.users.playerProfile.useQuery(
    { userId },
    REFETCH_ON_FOREGROUND,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const header = (
    <ScreenHeader nav="back" fallback={FALLBACK} title="Last 10 games" />
  );

  if (isNotFoundError(query.error)) {
    return (
      <Screen>
        {header}
        <Notice {...PLAYER_PROFILE_REFUSED} />
      </Screen>
    );
  }

  if (!query.data) {
    if (!query.error) {
      return (
        <Screen>
          {header}
          <Skeleton height={320} radius={16} />
        </Screen>
      );
    }
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title="Games could not be loaded"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const model = playerMatchesModel(
    query.data,
    { filter, matchId: openMatchId },
    apiOrigin,
  );
  const closeSheet = () => setOpenMatchId(null);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {header}
      <Text size="meta" tone="muted">
        {model.subtitle}
      </Text>
      <ChipGrid
        label="Filter games"
        chips={model.chips.map((chip) => ({
          value: chip.filter,
          label: chip.label,
        }))}
        isSelected={(value) => value === filter}
        onSelect={setFilter}
      />
      <Card>
        {model.empty ? (
          <View style={{ padding: spacing.surface }}>
            <Text tone="muted">{model.empty}</Text>
          </View>
        ) : (
          model.rows.map((row, index) => (
            <View key={row.matchId}>
              {index > 0 ? <Hairline /> : null}
              <PlayerMatchRow
                row={row}
                showPartner
                selected={row.matchId === selectedMatchId}
                onPress={() => {
                  setSelectedMatchId(row.matchId);
                  setOpenMatchId(row.matchId);
                }}
              />
            </View>
          ))
        )}
      </Card>
      <PlayerMatchSheet
        sheet={model.sheet}
        onClose={closeSheet}
        onOpenPlayer={(playerId) => {
          closeSheet();
          router.push(playerPath(segments, playerId));
        }}
        onOpenGame={(gameId) => {
          closeSheet();
          router.push(gamePath(gameId));
        }}
      />
    </Screen>
  );
}

export function PlayerMatchesRoute() {
  const { userId, match } = useLocalSearchParams<{
    userId: string;
    match?: string;
  }>();
  return <PlayerMatchesScreen userId={userId} initialMatchId={match ?? null} />;
}
