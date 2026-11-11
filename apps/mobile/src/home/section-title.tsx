import { View } from "react-native";

import { Text } from "../primitives/text";

export function SectionTitle({
  title,
  meta,
  status,
}: {
  title: string;
  meta?: string | null;
  status?: React.ReactNode;
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
      <Text
        size="title"
        weight="semibold"
        numberOfLines={1}
        accessibilityRole="header"
        style={{ flexShrink: 1 }}
      >
        {title}
      </Text>
      {status ??
        (meta ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null)}
    </View>
  );
}
