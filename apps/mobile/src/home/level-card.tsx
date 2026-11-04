import { radii, spacing } from "@repo/design-tokens";
import { homeLevelView, type HomeLevelInput } from "@repo/domain/home-level";
import { type Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { MountFill } from "../primitives/mount-fill";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { Card } from "./card";
import { noLevelCopy, type HomeLevel } from "./home-model";

const SWATCH = 12;
const NO_LEVEL_TILE = 74;

function Swatch({ provisional }: { provisional: boolean }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: SWATCH,
        height: SWATCH,
        backgroundColor: provisional ? undefined : palette.foreground,
      }}
    >
      {provisional ? <Hatch radius={2} /> : null}
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
  return level.kind === "rated" ? (
    <RatedLevel input={level.input} sport={sport} />
  ) : (
    <NoLevel sport={sport} />
  );
}

function NoLevel({ sport }: { sport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <Card title={m.home.level.heading[sport]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        <View style={{ width: NO_LEVEL_TILE, height: NO_LEVEL_TILE }}>
          <Hatch radius={radii.lg} />
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
    </Card>
  );
}

function RatedLevel({ input, sport }: { input: HomeLevelInput; sport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const view = homeLevelView(input, locale);

  return (
    <Card title={m.home.level.heading[sport]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          gap: 16,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        <Text
          size="levelBand"
          width="expanded"
          weight="bold"
          accessibilityLabel={m.mobileHome.level.bandSpoken(view.displayBand)}
        >
          {view.displayBand}
        </Text>
        <View style={{ width: 1, backgroundColor: palette.rule }} />
        <View
          style={{ flex: 1, minWidth: 0, justifyContent: "center", gap: 4 }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <Text size="h2" width="expanded" weight="bold">
              {view.level}
            </Text>
            <Text size="meta" tone="muted">
              {m.home.level.numberLabel}
            </Text>
          </View>
          {view.change ? (
            <View
              accessible
              accessibilityLabel={m.mobileHome.level.changeSpoken(
                view.change.spoken,
                view.change.amount,
                view.change.windowLabel,
              )}
              style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}
            >
              <Text size="h2" width="expanded" weight="bold">
                {view.change.signedAmount}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={1}>
                {view.change.windowLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Hairline />
      {view.progress ? (
        <View
          style={{
            paddingHorizontal: spacing.surface,
            paddingTop: 14,
            paddingBottom: 16,
            gap: 8,
          }}
        >
          <Text size="meta" tone="muted">
            {view.progress.label}
          </Text>
          <MountFill
            percent={view.progress.percent}
            hatched={view.provisional}
          />
        </View>
      ) : (
        <View
          style={{ paddingHorizontal: spacing.surface, paddingVertical: 12 }}
        >
          <Text size="meta">{m.profile.level.topBand}</Text>
        </View>
      )}
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <View style={{ paddingTop: 3 }}>
          <Swatch provisional={view.provisional} />
        </View>
        <Text size="meta" style={{ flex: 1 }}>
          <Text size="meta" weight="semibold">
            {view.legend.lead}
          </Text>
          {view.legend.rest}
        </Text>
      </View>
    </Card>
  );
}
