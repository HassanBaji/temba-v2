import { sizes } from "@repo/design-tokens";
import { Tag } from "lucide-react-native";
import { View, type StyleProp, type ViewStyle } from "react-native";

import type { TextWeight, TextWidth } from "./font-family";
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
  width,
  tone,
  iconSize = sizes.iconRow - 2,
  color,
  numberOfLines = 1,
  style,
}: {
  name: string;
  isNickname: boolean;
  size?: TextSize;
  weight?: TextWeight;
  width?: TextWidth;
  tone?: TextTone;
  iconSize?: number;
  /** For a row that sets its own ink, such as a bib-coloured team row. */
  color?: string;
  /** 0 lets a full name wrap instead of cutting it with dots. */
  numberOfLines?: number;
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
        width={width}
        tone={tone}
        numberOfLines={numberOfLines}
        style={{ flexShrink: 1, color }}
      >
        {name}
      </Text>
    </View>
  );
}
