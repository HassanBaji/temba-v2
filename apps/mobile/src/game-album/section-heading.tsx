import { View } from "react-native";

import { Text } from "../primitives/text";

export function SectionHeading({
  title,
  count,
}: {
  title: string;
  count: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      <Text size="eyebrow" tone="muted">
        {count}
      </Text>
    </View>
  );
}
