import { View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";

export function OpenSlot({ label, width }: { label: string; width?: number }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        width,
        minHeight: 28,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Hatch radius={4} />
      <Text
        size="meta"
        tone="muted"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </Text>
    </View>
  );
}
