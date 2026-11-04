import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTonePalette } from "../primitives/surface-context";

const VIEWBOX = 120;
const RADIUS = 52;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A progress ring with content in the middle, drawn clockwise from the top. */
export function LevelRing({
  percent,
  size = 112,
  children,
}: {
  percent: number;
  size?: number;
  children: React.ReactNode;
}) {
  const palette = useTonePalette();
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
        <Circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          fill="none"
          stroke={palette.rule}
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
