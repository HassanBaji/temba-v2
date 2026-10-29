import { spacing } from "@repo/design-tokens";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";

import { PlayerFootballLastTenCard } from "./football-last-ten-card";
import { PlayerFootballRoleCard } from "./football-role-card";
import { PlayerLastTenCard } from "./last-ten-card";
import { PlayerOverallCard } from "./overall-card";
import { PlayerHeader } from "./player-header";
import { PlayerPositionCard } from "./position-card";
import { PlayerStreaksCard } from "./streaks-card";
import type {
  FootballProfileModel,
  PlayerProfileModel,
} from "./player-profile-model";

export function PlayerProfileView({
  model,
  fallback,
  switcher,
  onOpenMatch,
  onSeeAll,
}: {
  model: PlayerProfileModel;
  fallback: Href;
  switcher?: ReactNode;
  onOpenMatch: (matchId: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <View style={{ gap: spacing.section }}>
      <PlayerHeader model={model} fallback={fallback} />
      {switcher}
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

export function FootballProfileView({
  model,
  fallback,
  switcher,
  onOpenGame,
}: {
  model: FootballProfileModel;
  fallback: Href;
  switcher?: ReactNode;
  onOpenGame: (gameId: string) => void;
}) {
  return (
    <View style={{ gap: spacing.section }}>
      <PlayerHeader model={model} fallback={fallback} />
      {switcher}
      <PlayerStreaksCard view={model.streaks} />
      <PlayerFootballRoleCard view={model.role} />
      <PlayerOverallCard view={model.overall} />
      <PlayerFootballLastTenCard
        summary={model.lastTen}
        rows={model.matches}
        onOpenGame={onOpenGame}
      />
    </View>
  );
}
