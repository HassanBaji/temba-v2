import { View } from "react-native";

import { Text } from "../primitives/text";

/** The first line of a hero: a muted label, then an optional tag. */
export function HeroTopLine({
  left,
  right,
}: {
  left: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text
        size="meta"
        tone="muted"
        numberOfLines={1}
        style={{ flex: 1, minWidth: 0 }}
      >
        {left}
      </Text>
      {right}
    </View>
  );
}
