import { sizes, spacing } from "@repo/design-tokens";
import {
  homeStandingRowView,
  type HomeStandingRow,
} from "@repo/domain/home-standing";
import { Pressable, View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { Card } from "./card";
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
    <Card title="Standing" flush>
      {rows.map(homeStandingRowView).map((row) => (
        <View key={row.groupId}>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.groupName}, ${row.sportLabel ?? ""} ${row.rank} ${row.ofCount}`.replace(
              /\s+/g,
              " ",
            )}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="medium" numberOfLines={1}>
                {row.groupName}
              </Text>
              {row.sportLabel ? (
                <Text size="meta" tone="muted">
                  {row.sportLabel}
                </Text>
              ) : null}
            </View>
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
