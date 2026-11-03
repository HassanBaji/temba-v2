import { radii } from "@repo/design-tokens";
import {
  resultMarkLabel,
  type ResultMarkVariant,
} from "@repo/domain/result-mark";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hatch } from "./hatch";
import { useTonePalette } from "./surface-context";
import { Text } from "./text";

export type FormSlotProps = {
  variant: ResultMarkVariant;
  label?: string;
  compact?: boolean;
};

const OUTLINE_WIDTH = 1.5;

export function FormSlot({ variant, label, compact = false }: FormSlotProps) {
  const locale = useLocale();
  const m = useMessages();
  const palette = useTonePalette();
  const height = compact ? 26 : 38;
  const radius = compact ? 4 : radii.slot;
  const accessibilityLabel = resultMarkLabel(variant, locale);

  if (variant === "not-played") {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        style={{ height, flex: 1, minWidth: 0 }}
      >
        <Hatch radius={radius} />
      </View>
    );
  }

  const won = variant === "won";
  const glyph = label ?? m.mobilePlayer.primitives.formSlot[variant];

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        height,
        flex: 1,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: radius,
        backgroundColor: won ? palette.foreground : palette.background,
        borderWidth: won ? 0 : OUTLINE_WIDTH,
        borderColor: palette.foreground,
      }}
    >
      {variant === "draw" ? (
        <Svg
          width="100%"
          height="100%"
          style={{ position: "absolute", opacity: 0.8 }}
          aria-hidden
        >
          <Line
            x1="100%"
            y1="0"
            x2="0"
            y2="100%"
            stroke={palette.foreground}
            strokeWidth={OUTLINE_WIDTH}
          />
        </Svg>
      ) : null}
      <Text
        size={compact ? "eyebrow" : "meta"}
        weight="semibold"
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ color: won ? palette.background : palette.foreground }}
      >
        {glyph}
      </Text>
    </View>
  );
}
