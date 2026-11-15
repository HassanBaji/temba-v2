import { radii } from "@repo/design-tokens";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "./hairline-width";
import { useTonePalette } from "./surface-context";
import { Text } from "./text";

/** A Guest player: dashed, because no Temba account stands behind the name. */
export function GuestMark() {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 6,
        borderRadius: radii.slot,
        borderWidth: hairline,
        borderStyle: "dashed",
        borderColor: palette.foreground,
      }}
    >
      <Text size="eyebrow" weight="medium">
        {m.group.addPlayer.guest.tag}
      </Text>
    </View>
  );
}
