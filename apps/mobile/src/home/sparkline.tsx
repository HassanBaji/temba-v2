import { sparklinePoints } from "@repo/domain/home-level-chart";
import Svg, { Circle, Polyline } from "react-native-svg";

import { mirrorInRtl } from "../i18n/rtl";
import { useTonePalette } from "../primitives/surface-context";

const SPARK_WIDTH = 60;
const SPARK_HEIGHT = 18;

/** A Level's recent run, newest last along the reading direction. */
export function Sparkline({
  values,
  width = SPARK_WIDTH,
  height = SPARK_HEIGHT,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
}) {
  const palette = useTonePalette();
  const points = sparklinePoints(values, width - 4, height - 4);
  if (!points) {
    return null;
  }
  const last = points.split(" ").at(-1)?.split(",").map(Number) ?? [0, 0];
  return (
    <Svg
      width={width}
      height={height}
      style={mirrorInRtl}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Polyline
        points={points}
        fill="none"
        stroke={palette.foreground}
        strokeWidth={1.5}
        strokeLinejoin="round"
        transform="translate(2 2)"
      />
      <Circle
        cx={(last[0] ?? 0) + 2}
        cy={(last[1] ?? 0) + 2}
        r={2.5}
        fill={palette.foreground}
      />
    </Svg>
  );
}
