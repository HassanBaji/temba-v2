import { expanded, numerals, typeScale } from "@repo/design-tokens";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { isLayoutRtl } from "../i18n/rtl";
import { fontFamilyFor, type TextWeight, type TextWidth } from "./font-family";
import { useTonePalette } from "./surface-context";
import { textDirectionStyle } from "./text-direction";

export type TextSize = keyof typeof typeScale | keyof typeof numerals;
export type TextTone = "default" | "muted";

function metricsFor(size: TextSize) {
  if (size in typeScale) {
    return typeScale[size as keyof typeof typeScale];
  }
  const fontSize = numerals[size as keyof typeof numerals];
  return { size: fontSize, lineHeight: fontSize };
}

export type TextProps = RNTextProps & {
  size?: TextSize;
  weight?: TextWeight;
  width?: TextWidth;
  tone?: TextTone;
  mono?: boolean;
  uppercase?: boolean;
  /** A value that reads LTR as a unit: phone, `@handle`, Level band, code. */
  ltr?: boolean;
};

export function Text({
  size = "body",
  weight = "regular",
  width = "normal",
  tone = "default",
  mono = false,
  uppercase = false,
  ltr = false,
  style,
  ...props
}: TextProps) {
  const palette = useTonePalette();
  const metrics = metricsFor(size);
  const isExpanded = width === "expanded" && !mono;

  return (
    <RNText
      {...props}
      style={[
        {
          ...textDirectionStyle(isLayoutRtl(), ltr),
          color: tone === "muted" ? palette.muted : palette.foreground,
          fontFamily: fontFamilyFor({ weight, width, mono }),
          fontSize: metrics.size,
          lineHeight: metrics.lineHeight,
          fontVariant: ["tabular-nums"],
          letterSpacing: isExpanded
            ? expanded.letterSpacingEm * metrics.size
            : undefined,
          textTransform: uppercase ? "uppercase" : undefined,
        },
        style,
      ]}
    />
  );
}
