import type { Href } from "expo-router";
import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { PlayerLevelCard } from "./level-card";
import type { PlayerProfileModel } from "./player-profile-model";

export function PlayerHeader({
  model,
  fallback,
}: {
  model: PlayerProfileModel;
  fallback: Href;
}) {
  return (
    <Surface tone="ink" style={{ gap: 20 }}>
      <ScreenHeader nav="back" fallback={fallback} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Avatar name={model.name} uri={model.imageUri} size="xl" />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            size="h2"
            weight="semibold"
            numberOfLines={2}
            accessibilityRole="header"
          >
            {model.name}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={2}>
            {model.subtitle}
          </Text>
        </View>
      </View>
      <PlayerLevelCard view={model.level} />
    </Surface>
  );
}
