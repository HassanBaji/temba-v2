import { sizes } from "@repo/design-tokens";
import { Tag } from "lucide-react-native";
import { View, type StyleProp, type ViewStyle } from "react-native";

import type { TextWeight } from "./font-family";
import { useTonePalette } from "./surface-context";
import { Text, type TextSize, type TextTone } from "./text";

/**
 * A member's name on a Group list. A Member nickname carries the tag icon, so
 * it never reads as the player's Temba name.
 */
export function NicknameName({
  name,
  isNickname,
  size,
  weight = "semibold",
  tone,
  iconSize = sizes.iconRow - 2,
  color,
  style,
}: {
  name: string;
  isNickname: boolean;
  size?: TextSize;
  weight?: TextWeight;
  tone?: TextTone;
  iconSize?: number;
  /** For a row that sets its own ink, such as a bib-coloured team row. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTonePalette();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          flexShrink: 1,
          minWidth: 0,
        },
        style,
      ]}
    >
      {isNickname ? (
        <Tag
          size={iconSize}
          color={
            color ?? (tone === "muted" ? palette.muted : palette.foreground)
          }
        />
      ) : null}
      <Text
        size={size}
        weight={weight}
        tone={tone}
        numberOfLines={1}
        style={{ flexShrink: 1, color }}
      >
        {name}
      </Text>
    </View>
  );
}
