import { radii } from "@repo/design-tokens";
import { Fragment } from "react";
import { View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

export type ReviewRow = { label: string; value: string };

export function ReviewCard({ rows }: { rows: readonly ReviewRow[] }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      {rows.map((row, index) => (
        <Fragment key={row.label}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={`${row.label}: ${row.value}`}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <Text size="meta" tone="muted">
              {row.label}
            </Text>
            <Text
              size="meta"
              weight="medium"
              style={{ flexShrink: 1, textAlign: "right" }}
            >
              {row.value}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
