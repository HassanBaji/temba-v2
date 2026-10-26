import { spacing } from "@repo/design-tokens";
import { Fragment } from "react";
import { View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export type InfoRow = { label: string; value: string };

/** Label and value lines on one card, split by hairlines. */
export function InfoRows({ rows }: { rows: readonly InfoRow[] }) {
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {rows.map((row, index) => (
        <Fragment key={row.label}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={`${row.label}: ${row.value}`}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 16,
              paddingHorizontal: spacing.surface,
              paddingVertical: 14,
            }}
          >
            <Text tone="muted">{row.label}</Text>
            <Text style={{ flexShrink: 1, textAlign: "right" }}>
              {row.value}
            </Text>
          </View>
        </Fragment>
      ))}
    </Surface>
  );
}
