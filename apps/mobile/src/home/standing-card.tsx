import { sizes, spacing } from "@repo/design-tokens";
import {
  homeStandingRowView,
  type HomeStandingRow,
} from "@repo/domain/home-standing";
import { Pressable, View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { Card } from "./card";
import { standingCountLabel } from "./home-model";
import type { HomeNavTarget } from "./home-target";

export function StandingCard({
  rows,
  onNavigate,
}: {
  rows: readonly HomeStandingRow[];
  onNavigate: (target: HomeNavTarget) => void;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card
      title="Standing"
      meta={standingCountLabel(rows.length)}
      monoMeta
      flush
    >
      {rows.map(homeStandingRowView).map((row) => (
        <View key={row.groupId}>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.groupName}, ${row.rank} ${row.ofCount}`}
            onPress={() => onNavigate({ kind: "group", groupId: row.groupId })}
            style={({ pressed }) => ({
              minHeight: sizes.touchTarget + 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: spacing.surface,
              paddingVertical: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              weight="semibold"
              numberOfLines={1}
              style={{ flex: 1, minWidth: 0 }}
            >
              {row.groupName}
            </Text>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
            >
              <Text size="title" width="expanded" weight="bold">
                {row.rank}
              </Text>
              <Text size="meta" tone="muted">
                {row.ofCount}
              </Text>
            </View>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}
