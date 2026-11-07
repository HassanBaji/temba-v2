import { spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** A hatched cell for a detail that is not set yet, such as When or Where. */
export function NotSetCell({
  label,
  divided,
}: {
  label: string;
  divided: boolean;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
        gap: 2,
        borderStartWidth: divided ? hairline : 0,
        borderStartColor: colors.rule,
      }}
    >
      <Hatch bordered={false} radius={0} />
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
      <Text weight="semibold">{m.common.notSet}</Text>
    </View>
  );
}
