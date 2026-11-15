import { spacing } from "@repo/design-tokens";
import { formatPadelLevel } from "@repo/domain/level";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { LevelRing } from "./level-ring";
import {
  curveGuideLabels,
  type HeroStat,
  type HeroView,
} from "./profile-model";
import { RatingCurve } from "./rating-curve";

export function HeroStats({ stats }: { stats: HeroStat[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {stats.map((stat) => (
        <View
          key={stat.label}
          accessible
          accessibilityLabel={`${stat.value} ${stat.label}`}
          style={{ flex: 1, minWidth: 0, gap: 2 }}
        >
          <Text size="title" width="expanded" weight="bold">
            {stat.value}
          </Text>
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <Text size="eyebrow" tone="muted" mono uppercase numberOfLines={1}>
      {children}
    </Text>
  );
}

/** The ink card for the chosen scope: ring, Level, outlook, curve, three stats. */
export function LevelHero({ view }: { view: HeroView }) {
  const m = useMessages();

  if (view.kind === "none") {
    return (
      <Surface tone="ink" style={{ gap: spacing.compact }}>
        <Eyebrow>{view.label}</Eyebrow>
        <View style={{ gap: 6 }}>
          <Text size="h2" weight="bold">
            {m.you.hero.noLevel}
          </Text>
          <Text size="meta" tone="muted">
            {m.you.hero.noLevelNote}
          </Text>
        </View>
        <Hairline />
        <HeroStats stats={view.stats} />
      </Surface>
    );
  }

  const first = view.curve.values[0];
  const last = view.curve.values[view.curve.values.length - 1];

  return (
    <Surface tone="ink" style={{ gap: spacing.compact }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <Eyebrow>{view.label}</Eyebrow>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {view.status}
        </Text>
      </View>
      <View
        accessible
        accessibilityLabel={view.spoken}
        style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
      >
        <LevelRing percent={view.ring.percent}>
          <Text size="h1Lg" width="expanded" weight="bold" ltr>
            {view.band}
          </Text>
          <Text
            size="eyebrow"
            tone="muted"
            numberOfLines={2}
            style={{ textAlign: "center", maxWidth: 80 }}
          >
            {view.ring.label}
          </Text>
        </LevelRing>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}
          >
            <Text size="display" width="expanded" weight="bold">
              {view.rating}
            </Text>
            <Text size="meta" tone="muted">
              {m.you.hero.rating}
            </Text>
          </View>
          {view.movement ? (
            <Text size="meta" weight="semibold">
              {view.movement}
            </Text>
          ) : null}
          <Text size="eyebrow" tone="muted">
            {view.outlook}
          </Text>
        </View>
      </View>
      {view.curve.values.length > 1 && first != null && last != null ? (
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Eyebrow>{view.curve.title}</Eyebrow>
            {view.curve.span ? <Eyebrow>{view.curve.span}</Eyebrow> : null}
          </View>
          <RatingCurve
            values={view.curve.values}
            labels={curveGuideLabels(view.curve.values)}
            accessibilityLabel={m.mobileYou.curveSpoken(
              formatPadelLevel(first, 2),
              formatPadelLevel(last, 2),
            )}
          />
        </View>
      ) : null}
      <Hairline />
      <HeroStats stats={view.stats} />
    </Surface>
  );
}
