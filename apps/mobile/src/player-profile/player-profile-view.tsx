import { spacing } from "@repo/design-tokens";
import type { Href } from "expo-router";
import { View } from "react-native";

import { PlayerLastTenCard } from "./last-ten-card";
import { PlayerOverallCard } from "./overall-card";
import { PlayerHeader } from "./player-header";
import { PlayerPositionCard } from "./position-card";
import { PlayerStreaksCard } from "./streaks-card";
import type { PlayerProfileModel } from "./player-profile-model";

export function PlayerProfileView({
  model,
  fallback,
  onOpenMatch,
  onSeeAll,
}: {
  model: PlayerProfileModel;
  fallback: Href;
  onOpenMatch: (matchId: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <View style={{ gap: spacing.section }}>
      <PlayerHeader model={model} fallback={fallback} />
      <PlayerStreaksCard view={model.streaks} />
      <PlayerPositionCard view={model.position} />
      <PlayerOverallCard view={model.overall} />
      <PlayerLastTenCard
        summary={model.lastTen}
        rows={model.recentMatches}
        onOpenMatch={onOpenMatch}
        onSeeAll={onSeeAll}
      />
    </View>
  );
}
