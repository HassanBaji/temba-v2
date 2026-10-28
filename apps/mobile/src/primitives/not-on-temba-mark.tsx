import { radii } from "@repo/design-tokens";
import { NOT_ON_TEMBA_YET_LABEL } from "@repo/domain/add-player-by-phone";
import { View } from "react-native";

import { hairline } from "./hairline-width";
import { useTonePalette } from "./surface-context";
import { Text } from "./text";

export function NotOnTembaMark() {
  const palette = useTonePalette();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 6,
        borderRadius: radii.slot,
        borderWidth: hairline,
        borderColor: palette.foreground,
      }}
    >
      <Text size="eyebrow" weight="medium">
        {NOT_ON_TEMBA_YET_LABEL}
      </Text>
    </View>
  );
}
