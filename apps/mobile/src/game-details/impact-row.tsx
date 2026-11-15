import { View } from "react-native";

import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

export type ImpactRowLine = {
  title: string;
  detail: string;
  delta: string;
  spoken: string;
};

/** One line of what a Game moved, and the total under them on wash. */
export function ImpactRow({
  row,
  total = false,
}: {
  row: ImpactRowLine;
  total?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${row.spoken}. ${row.detail}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: total ? colors.wash : undefined,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{row.title}</Text>
        <Text size="meta" tone="muted">
          {row.detail}
        </Text>
      </View>
      <Text size={total ? "h2" : "lead"} weight="bold" width="expanded">
        {row.delta}
      </Text>
    </View>
  );
}
