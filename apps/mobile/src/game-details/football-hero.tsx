import { spacing } from "@repo/design-tokens";
import type { FootballGameHero } from "@repo/domain/football-game-details";
import { SPORT_LABELS } from "@repo/domain/sport";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import type { Href } from "expo-router";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { SportGlyph } from "../lib/sport-glyph";
import { hairline } from "../primitives/hairline-width";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const HERO_PADDING_BOTTOM = 22;

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

function SportLine() {
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <SportGlyph sport="football" color={palette.muted} size={14} />
      <Text size="eyebrow" tone="muted" mono uppercase>
        {SPORT_LABELS.football}
      </Text>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {UNRATED_LABEL}
      </Text>
    </View>
  );
}

export function FootballHero({
  hero,
  fallback,
  actions,
}: {
  hero: FootballGameHero;
  fallback: Href;
  actions?: React.ReactNode;
}) {
  return (
    <Surface
      tone={hero.tone}
      style={{
        paddingTop: spacing.compact,
        paddingBottom: HERO_PADDING_BOTTOM,
        borderRadius: 0,
        borderWidth: 0,
        borderBottomWidth: hero.tone === "paper" ? hairline : 0,
      }}
    >
      {hero.tone === "ink" ? <LightStatusBar /> : null}
      <ScreenHeader nav="back" fallback={fallback} actions={actions}>
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              size="meta"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {hero.dateLabel ?? "Time unset"}
            </Text>
            {hero.statusLabel ? (
              <Text size="meta" tone="muted">
                {hero.statusLabel}
              </Text>
            ) : null}
          </View>
          <Text size="display" width="expanded" weight="bold">
            {hero.sizeLine}
          </Text>
          {hero.kickoffTime ? (
            <View
              accessible
              accessibilityLabel={`${hero.kickoffTime} ${hero.trailer ?? ""}`}
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "baseline",
                columnGap: 8,
              }}
            >
              <Text size="title" width="expanded" weight="bold">
                {hero.kickoffTime}
              </Text>
              {hero.trailer ? (
                <Text size="meta" tone="muted">
                  {hero.trailer}
                </Text>
              ) : null}
            </View>
          ) : null}
          {hero.placeLine ? (
            <Text size="lead" weight="semibold">
              {hero.placeLine}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 24 }}>
            {hero.figures.map((figure) => (
              <View
                key={figure.key}
                accessible
                accessibilityLabel={`${figure.label}: ${figure.value}`}
                style={{ gap: 2 }}
              >
                <Text size="figure" width="expanded" weight="bold">
                  {figure.value}
                </Text>
                <Text size="meta" tone="muted">
                  {figure.label}
                </Text>
              </View>
            ))}
          </View>
          <SportLine />
        </View>
      </ScreenHeader>
    </Surface>
  );
}
