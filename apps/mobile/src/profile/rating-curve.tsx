import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

import { isLayoutRtl } from "../i18n/rtl";
import { MountDraw } from "../primitives/mount-draw";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { curvePoints, pathFor, pathLength } from "./profile-model";

const HEIGHT = 96;
const PAD = 8;
const DOT = 4;
const LABEL_WIDTH = 26;

/**
 * The scope's Level after each rated Match. Time runs with the reading
 * direction, so in Arabic the latest point sits on the left.
 */
export function RatingCurve({
  values,
  labels,
  accessibilityLabel,
}: {
  values: number[];
  /** Top, middle and bottom guide labels. */
  labels: [string, string, string];
  accessibilityLabel: string;
}) {
  const palette = useTonePalette();
  const [width, setWidth] = useState(0);
  const plotWidth = Math.max(0, width - LABEL_WIDTH);
  const points = curvePoints(values, plotWidth, HEIGHT, {
    pad: PAD,
    mirrored: isLayoutRtl(),
  });
  const last = points[points.length - 1];
  const guides = [PAD, HEIGHT / 2, HEIGHT - PAD];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: HEIGHT, flexDirection: "row" }}
    >
      <View style={{ width: plotWidth, height: HEIGHT }}>
        {plotWidth > 0 ? (
          <>
            <Svg
              width={plotWidth}
              height={HEIGHT}
              style={{ position: "absolute" }}
            >
              {guides.map((y) => (
                <Line
                  key={y}
                  x1={0}
                  x2={plotWidth}
                  y1={y}
                  y2={y}
                  stroke={palette.rule}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
              ))}
            </Svg>
            {points.length > 1 ? (
              <MountDraw
                d={pathFor(points)}
                length={pathLength(points)}
                width={plotWidth}
                height={HEIGHT}
                strokeWidth={1.75}
              />
            ) : null}
            {last ? (
              <Svg
                width={plotWidth}
                height={HEIGHT}
                style={{ position: "absolute" }}
              >
                <Circle
                  cx={last.x}
                  cy={last.y}
                  r={DOT}
                  fill={palette.foreground}
                />
              </Svg>
            ) : null}
          </>
        ) : null}
      </View>
      <View
        style={{
          width: LABEL_WIDTH,
          height: HEIGHT,
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        {labels.map((label, index) => (
          <Text key={`${label}-${index}`} size="eyebrow" tone="muted" mono>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}
