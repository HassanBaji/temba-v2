import { spacing } from "@repo/design-tokens";
import type { Href } from "expo-router";
import { View } from "react-native";

import { PlayerOverallCard } from "./overall-card";
import { PlayerHeader } from "./player-header";
import type { PlayerProfileModel } from "./player-profile-model";

export function PlayerProfileView({
  model,
  fallback,
}: {
  model: PlayerProfileModel;
  fallback: Href;
}) {
  return (
    <View style={{ gap: spacing.section }}>
      <PlayerHeader model={model} fallback={fallback} />
      <PlayerOverallCard view={model.overall} />
    </View>
  );
}
