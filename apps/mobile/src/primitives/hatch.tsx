import { hatch, radii } from "@repo/design-tokens";
import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

import { hairline } from "./hairline-width";
import { hatchPatternId } from "./hatch-pattern-id";
import { useTonePalette } from "./surface-context";

export type HatchProps = {
  radius?: number;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Hatch({
  radius = radii.slot,
  bordered = true,
  style,
}: HatchProps) {
  const palette = useTonePalette();
  const patternId = hatchPatternId(useId());

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      pointerEvents="none"
      style={[
        styles.fill,
        {
          borderRadius: radius,
          borderWidth: bordered ? hairline : 0,
          borderColor: palette.rule,
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={hatch.period}
            height={hatch.period}
            patternTransform={`rotate(${hatch.angle})`}
          >
            <Rect
              x={0}
              y={0}
              width={hatch.stroke}
              height={hatch.period}
              fill={palette.hatchStroke}
            />
          </Pattern>
        </Defs>
        <Rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
});
