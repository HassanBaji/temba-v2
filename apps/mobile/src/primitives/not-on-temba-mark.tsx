import { radii } from "@repo/design-tokens";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "./hairline-width";
import { useTonePalette } from "./surface-context";
import { Text } from "./text";

export function NotOnTembaMark() {
  const m = useMessages();
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
        {m.group.addPlayer.notOnTembaYet}
      </Text>
    </View>
  );
}
