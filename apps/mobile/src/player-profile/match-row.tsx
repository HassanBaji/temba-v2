import { sizes, spacing } from "@repo/design-tokens";
import type { PlayerMatchRowView } from "@repo/domain/player-profile-matches";
import { Pressable, View, type ViewStyle } from "react-native";

import { ResultMark } from "../primitives/result-mark";
import { Text } from "../primitives/text";

const ROW: ViewStyle = {
  minHeight: sizes.touchTarget,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingHorizontal: spacing.surface,
  paddingVertical: 14,
};

export function PlayerMatchRow({
  row,
  onPress,
}: {
  row: PlayerMatchRowView;
  onPress?: () => void;
}) {
  const content = (
    <>
      <ResultMark variant={row.outcome} size={20} decorative />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="body" weight="semibold" numberOfLines={1}>
          {row.opponents}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {row.meta}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {row.sets.map((set, index) => (
            <Text key={index} size="body" weight="semibold">
              {set}
            </Text>
          ))}
        </View>
        {row.delta ? (
          <Text size="meta" tone="muted">
            {row.delta}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={row.accessibilityLabel} style={ROW}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [ROW, { opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}
