import { resultMark } from "@repo/design-tokens";
import {
  RESULT_MARK_LABEL,
  type ResultMarkVariant,
} from "@repo/domain/result-mark";
import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Hatch } from "./hatch";
import { useTonePalette } from "./surface-context";

export type ResultMarkProps = {
  variant: ResultMarkVariant;
  size?: number;
  decorative?: boolean;
};

export function ResultMark({
  variant,
  size = 24,
  decorative = false,
}: ResultMarkProps) {
  const palette = useTonePalette();
  const notPlayed = variant === "not-played";
  const stroke = notPlayed ? palette.rule : palette.foreground;

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={decorative ? undefined : RESULT_MARK_LABEL[variant]}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      accessibilityElementsHidden={decorative}
      style={{ width: size, height: size }}
    >
      {notPlayed ? <Hatch radius={size / 2} bordered={false} /> : null}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${resultMark.viewBox} ${resultMark.viewBox}`}
      >
        {variant === "won" ? (
          <>
            <Circle {...resultMark.wonDisc} fill={palette.foreground} />
            <Path
              d={resultMark.arc}
              fill="none"
              stroke={palette.background}
              strokeWidth={resultMark.wonArcStroke}
            />
          </>
        ) : notPlayed ? (
          <Path
            d={resultMark.arc}
            fill="none"
            stroke={stroke}
            strokeWidth={resultMark.notPlayedArcStroke}
          />
        ) : (
          <>
            <Circle
              {...resultMark.outlineDisc}
              fill="none"
              stroke={stroke}
              strokeWidth={resultMark.outlineStroke}
            />
            <Path
              d={resultMark.arc}
              fill="none"
              stroke={stroke}
              strokeWidth={resultMark.outlineStroke}
            />
            {variant === "draw" ? (
              <Path
                d={resultMark.drawStrike}
                fill="none"
                stroke={stroke}
                strokeWidth={resultMark.outlineStroke}
              />
            ) : null}
          </>
        )}
      </Svg>
    </View>
  );
}
