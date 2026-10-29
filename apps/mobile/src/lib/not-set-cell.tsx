import { colors, spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";

/** A hatched cell for a detail that is not set yet, such as When or Where. */
export function NotSetCell({
  label,
  divided,
}: {
  label: string;
  divided: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
        gap: 2,
        borderLeftWidth: divided ? hairline : 0,
        borderLeftColor: colors.rule,
      }}
    >
      <Hatch bordered={false} radius={0} />
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
      <Text weight="semibold">Not set</Text>
    </View>
  );
}
