import { spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function Card({
  title,
  meta,
  monoMeta = false,
  children,
  flush = false,
}: {
  title?: string;
  meta?: string;
  monoMeta?: boolean;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <Surface tone="paper" padded={false} style={{ overflow: "hidden" }}>
      {title ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: spacing.surface,
            paddingTop: spacing.surface,
            paddingBottom: flush ? 4 : 12,
          }}
        >
          <Text size="meta" tone="muted" accessibilityRole="header">
            {title}
          </Text>
          {meta ? (
            <Text
              size={monoMeta ? "eyebrow" : "meta"}
              tone="muted"
              mono={monoMeta}
              uppercase={monoMeta}
            >
              {meta}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </Surface>
  );
}
