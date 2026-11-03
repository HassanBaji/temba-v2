import { View } from "react-native";

import { Text } from "../primitives/text";

const ACTION_GAP = 4;

/** The first line of a hero: a muted label, an optional tag, then the screen's actions. */
export function HeroTopLine({
  left,
  right,
  actions,
}: {
  left: string;
  right?: React.ReactNode;
  actions?: React.ReactNode;
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
      {actions ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: ACTION_GAP,
          }}
        >
          {actions}
        </View>
      ) : null}
    </View>
  );
}
