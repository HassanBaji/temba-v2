import { spacing } from "@repo/design-tokens";
import { type HomeLevelInput } from "@repo/domain/home-level";
import { homeTrendView, type TrendPoint } from "@repo/domain/home-level-trend";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Polyline } from "react-native-svg";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { SectionTitle } from "./section-title";

const CHART_HEIGHT = 96;
const INSET = 8;
const DOT = 4.5;
const SMALL_DOT = 3;
const LINE = 1.5;

function Dot({ point }: { point: TrendPoint }) {
  const palette = useTonePalette();
  const { x, y, kind } = point;
  if (kind === "start" || kind === "set") {
    return <Circle cx={x} cy={y} r={SMALL_DOT} fill={palette.muted} />;
  }
  if (kind === "won") {
    return <Circle cx={x} cy={y} r={DOT} fill={palette.foreground} />;
  }
  return (
    <>
      <Circle
        cx={x}
        cy={y}
        r={DOT}
        fill={palette.background}
        stroke={palette.foreground}
        strokeWidth={LINE}
      />
      {kind === "drawn" ? (
        <Path
          d={`M ${x} ${y - DOT} A ${DOT} ${DOT} 0 0 0 ${x} ${y + DOT} Z`}
          fill={palette.foreground}
        />
      ) : null}
    </>
  );
}

function Chart({
  points,
  baselineY,
  width,
}: {
  points: readonly TrendPoint[];
  baselineY: number;
  width: number;
}) {
  const palette = useTonePalette();
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) {
    return null;
  }
  return (
    <Svg width={width} height={CHART_HEIGHT}>
      <Polygon
        points={`${line} ${last.x},${CHART_HEIGHT} ${first.x},${CHART_HEIGHT}`}
        fill={palette.wash}
      />
      <Line
        x1={INSET}
        y1={baselineY}
        x2={width - INSET}
        y2={baselineY}
        stroke={palette.muted}
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <Polyline
        points={line}
        fill="none"
        stroke={palette.foreground}
        strokeWidth={LINE}
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <Dot key={index} point={point} />
      ))}
    </Svg>
  );
}

export function TrendCard({ input }: { input: HomeLevelInput }) {
  const m = useMessages();
  const locale = useLocale();
  const [width, setWidth] = useState(0);
  const copy = m.home.trend;
  const view = homeTrendView(
    input,
    { width: Math.max(width, INSET * 4), height: CHART_HEIGHT, inset: INSET },
    locale,
  );
  if (!view) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={copy.title} meta={view.window} />
      <Surface padded={false} radius="card">
        <View
          accessible
          accessibilityLabel={view.spoken}
          style={{ padding: spacing.surface, gap: 14 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text size="statTotal" width="expanded" weight="bold">
              {view.signedDelta}
            </Text>
            <Text size="meta" tone="muted" numberOfLines={1}>
              {copy.from(view.from)}
              <Text size="meta" weight="bold">
                {view.to}
              </Text>
            </Text>
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            style={{ height: CHART_HEIGHT }}
          >
            {width > 0 ? (
              <Chart
                points={view.points}
                baselineY={view.baselineY}
                width={width}
              />
            ) : null}
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              flexDirection: "row",
              direction: "ltr",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {view.startLabel}
            </Text>
            <Text
              size="eyebrow"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1, textAlign: "center" }}
            >
              {view.legend}
            </Text>
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {copy.latest}
            </Text>
          </View>
        </View>
      </Surface>
    </View>
  );
}
