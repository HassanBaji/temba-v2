import { hatch, spacing } from "@repo/design-tokens";
import { homeLevelView, type HomeLevelInput } from "@repo/domain/home-level";
import {
  gaugeArc,
  parseLevelHistory,
  sparklinePoints,
} from "@repo/domain/home-level-chart";
import { nextDistinctDisplayRung } from "@repo/domain/level-bands";
import { type Sport } from "@repo/domain/sport";
import { Check } from "lucide-react-native";
import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Pattern, Polyline, Rect } from "react-native-svg";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { hatchPatternId } from "../primitives/hatch-pattern-id";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { noLevelCopy, type HomeLevel } from "./home-model";
import { SectionTitle } from "./section-title";

const GAUGE = 104;
const VIEWBOX = 120;
const RADIUS = 50;
const STROKE = 10;
const SPARK_WIDTH = 60;
const SPARK_HEIGHT = 18;
const SWATCH = 12;
const NO_LEVEL_TILE = 74;
const STATUS_ICON = 14;

function Gauge({ percent, band }: { percent: number; band: string }) {
  const palette = useTonePalette();
  const patternId = hatchPatternId(useId());
  const arc = gaugeArc(percent, RADIUS);
  const center = VIEWBOX / 2;
  return (
    <View
      style={{
        width: GAUGE,
        height: GAUGE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={GAUGE}
        height={GAUGE}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={{ position: "absolute" }}
      >
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
              width={hatch.period}
              height={hatch.period}
              fill={palette.background}
            />
            <Rect
              x={0}
              y={0}
              width={hatch.stroke * 1.5}
              height={hatch.period}
              fill={palette.hatchStroke}
            />
          </Pattern>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke={`url(#${patternId})`}
          strokeWidth={STROKE}
        />
        {arc > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={palette.foreground}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${2 * Math.PI * RADIUS}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      <Text size="display" width="expanded" weight="bold" ltr>
        {band}
      </Text>
    </View>
  );
}

function Sparkline({ values }: { values: readonly number[] }) {
  const palette = useTonePalette();
  const points = sparklinePoints(values, SPARK_WIDTH - 4, SPARK_HEIGHT - 4);
  if (!points) {
    return null;
  }
  const last = points.split(" ").at(-1)?.split(",").map(Number) ?? [0, 0];
  return (
    <Svg
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
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

function Status({ provisional }: { provisional: boolean }) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {provisional ? (
        <View style={{ width: SWATCH, height: SWATCH }}>
          <Hatch radius={2} />
        </View>
      ) : (
        <Check size={STATUS_ICON} color={palette.foreground} />
      )}
      <Text size="meta" tone={provisional ? "muted" : "default"}>
        {provisional
          ? m.home.levelSection.provisional
          : m.home.levelSection.confirmed}
      </Text>
    </View>
  );
}

export function LevelCard({
  level,
  sport,
}: {
  level: HomeLevel;
  sport: Sport;
}) {
  const m = useMessages();
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle
        title={m.home.levelSection.title[sport]}
        status={
          level.kind === "rated" ? (
            <Status provisional={level.input.provisional} />
          ) : undefined
        }
      />
      {level.kind === "rated" ? (
        <RatedLevel input={level.input} />
      ) : (
        <NoLevel sport={sport} />
      )}
    </View>
  );
}

function NoLevel({ sport }: { sport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <Surface>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <View style={{ width: NO_LEVEL_TILE, height: NO_LEVEL_TILE }}>
          <Hatch radius={NO_LEVEL_TILE / 2} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text size="lead" weight="semibold">
            {m.profile.levelCard.noLevelYet}
          </Text>
          <Text size="meta" tone="muted">
            {noLevelCopy(sport, locale)}
          </Text>
        </View>
      </View>
    </Surface>
  );
}

function FooterRow({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
      }}
    >
      {children}
    </View>
  );
}

function RatedLevel({ input }: { input: HomeLevelInput }) {
  const m = useMessages();
  const locale = useLocale();
  const view = homeLevelView(input, locale);
  const next = nextDistinctDisplayRung(input.band);
  const values = parseLevelHistory(input.history)?.values ?? [];
  const percent = view.progress?.percent ?? 100;
  const copy = m.home.levelSection;

  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          padding: spacing.surface,
        }}
      >
        <View
          accessible
          accessibilityLabel={
            next
              ? copy.gaugeSpoken(view.displayBand, percent, next)
              : m.mobileHome.level.bandSpoken(view.displayBand)
          }
        >
          <Gauge percent={percent} band={view.displayBand} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size="eyebrow" tone="muted">
            {view.numberLabel}
          </Text>
          <Text size="hero" width="expanded" weight="bold">
            {view.level}
          </Text>
          {view.change ? (
            <View
              accessible
              accessibilityLabel={m.mobileHome.level.changeSpoken(
                view.change.spoken,
                view.change.amount,
                view.change.windowLabel,
              )}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Sparkline values={values} />
              <Text weight="bold" width="expanded">
                {view.change.signedAmount}
              </Text>
              <Text size="eyebrow" tone="muted" numberOfLines={1}>
                {copy.lastN(input.historyMatchCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Hairline />
      <FooterRow>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {next ? copy.nextBand : copy.topBand}
          </Text>
          {next ? (
            <Text size="meta" tone="muted" numberOfLines={1}>
              <Text size="meta" width="expanded" weight="bold" ltr>
                {next}
              </Text>
              {copy.nextBandValue(percent)}
            </Text>
          ) : null}
        </View>
      </FooterRow>
      {view.provisional ? (
        <>
          <Hairline />
          <FooterRow>
            <Text size="meta" tone="muted">
              {copy.confirmsIn(Math.max(1, input.ratedMatchesRemaining))}
            </Text>
          </FooterRow>
        </>
      ) : null}
    </Surface>
  );
}
