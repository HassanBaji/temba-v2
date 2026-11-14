import { hatch } from "@repo/design-tokens";
import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";

import { hatchPatternId } from "../primitives/hatch-pattern-id";
import { useTonePalette } from "../primitives/surface-context";

const VIEWBOX = 120;
const RADIUS = 52;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A progress ring with content in the middle, drawn clockwise from the top.
 * `hatched` draws the track as "not yet", for a Provisional Level.
 */
export function LevelRing({
  percent,
  size = 112,
  hatched = false,
  children,
}: {
  percent: number;
  size?: number;
  hatched?: boolean;
  children: React.ReactNode;
}) {
  const palette = useTonePalette();
  const patternId = hatchPatternId(useId());
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * CIRCUMFERENCE;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={{ position: "absolute" }}
      >
        {hatched ? (
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
        ) : null}
        <Circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          fill="none"
          stroke={hatched ? `url(#${patternId})` : palette.rule}
          strokeWidth={STROKE}
        />
        {filled > 0 ? (
          <Circle
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={RADIUS}
            fill="none"
            stroke={palette.foreground}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
