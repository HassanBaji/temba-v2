import { radii, spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { HeroStats } from "./level-hero";
import { LevelRing } from "./level-ring";
import {
  footballTabView,
  partnerRows,
  type FootballProfile,
  type MyProfile,
} from "./profile-model";
import { LastTenStrip, PartnersCard, SECTION_GAP } from "./profile-sections";
import { RatingsLink } from "./ratings-screen";

const BAR_HEIGHT = 56;

function GoalBars({
  bars,
}: {
  bars: ReturnType<typeof footballTabView>["goals"]["bars"];
}) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        height: BAR_HEIGHT + 18,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      {bars.map((bar) => (
        <View
          key={bar.key}
          accessible
          accessibilityLabel={bar.spoken}
          style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 4 }}
        >
          <View
            style={{
              alignSelf: "stretch",
              height:
                bar.goals == null || bar.goals === 0
                  ? 3
                  : Math.max(6, (bar.percent / 100) * BAR_HEIGHT),
              borderRadius: 2,
              backgroundColor:
                bar.goals != null && bar.goals > 0
                  ? palette.foreground
                  : palette.rule,
            }}
          />
          <Text size="eyebrow" tone="muted" mono>
            {bar.goals == null ? " " : String(bar.goals)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RecordBar({
  wonPercent,
  drawnPercent,
  lostPercent,
}: {
  wonPercent: number;
  drawnPercent: number;
  lostPercent: number;
}) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        height: 8,
        flexDirection: "row",
        borderRadius: radii.sm,
        overflow: "hidden",
        gap: 2,
      }}
    >
      {wonPercent > 0 ? (
        <View
          style={{ flex: wonPercent, backgroundColor: palette.foreground }}
        />
      ) : null}
      {drawnPercent > 0 ? (
        <View style={{ flex: drawnPercent }}>
          <Hatch radius={0} />
        </View>
      ) : null}
      {lostPercent > 0 ? (
        <View
          style={{
            flex: lostPercent,
            borderWidth: 1,
            borderColor: palette.foreground,
          }}
        />
      ) : null}
    </View>
  );
}

/** Football: self-placed or set Level, goals, Last 10, record, Teammates. */
export function FootballTab({
  football,
  teammates,
  onOpenPlayer,
  onOpenRatings,
}: {
  football: FootballProfile;
  teammates: MyProfile["partners"];
  onOpenPlayer: (userId: string) => void;
  onOpenRatings: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = footballTabView(football, locale);

  return (
    <View style={{ gap: SECTION_GAP }}>
      <Surface tone="ink" style={{ gap: spacing.compact }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="eyebrow" tone="muted" mono uppercase>
            {m.you.football.level}
          </Text>
          {view.level?.status ? (
            <Text size="eyebrow" tone="muted">
              {view.level.status}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {view.level ? (
            <View
              accessible
              accessibilityLabel={m.rating.ovr.value(view.level.ovr)}
            >
              <LevelRing percent={view.level.ringPercent}>
                <Text size="h1Lg" width="expanded" weight="bold">
                  {view.level.ovr}
                </Text>
                <Text size="eyebrow" tone="muted">
                  {view.level.ovrLabel}
                </Text>
              </LevelRing>
            </View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            {view.level == null ? (
              <Text size="h2" width="expanded" weight="bold" numberOfLines={1}>
                {m.you.hero.noLevel}
              </Text>
            ) : null}
            {view.level?.placement ? (
              <Text size="meta" tone="muted">
                {view.level.placement}
              </Text>
            ) : null}
            <Text size="meta">{view.roleLine}</Text>
            <Text size="eyebrow" tone="muted">
              {m.you.football.adjustNote}
            </Text>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text size="eyebrow" tone="muted" mono uppercase>
              {m.you.football.goalsLastTen}
            </Text>
            <Text size="eyebrow" tone="muted" mono uppercase>
              {view.goals.total}
            </Text>
          </View>
          <GoalBars bars={view.goals.bars} />
        </View>
        <Hairline />
        <HeroStats stats={view.stats} />
      </Surface>

      <RatingsLink sport="football" onOpen={onOpenRatings} />

      <LastTenStrip
        title={m.you.form.lastTen}
        record={view.lastTenRecord}
        slots={view.lastTen}
      />

      <Surface radius="card" style={{ padding: 16, gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {m.you.football.allTimeRecord}
          </Text>
          <Text size="meta" tone="muted">
            {view.allTime.matches}
          </Text>
        </View>
        <View accessible accessibilityLabel={view.allTime.spoken}>
          <RecordBar
            wonPercent={view.allTime.wonPercent}
            drawnPercent={view.allTime.drawnPercent}
            lostPercent={view.allTime.lostPercent}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: 14,
          }}
        >
          {(
            [
              [view.allTime.won, m.you.football.won],
              [view.allTime.drawn, m.you.football.drawn],
              [view.allTime.lost, m.you.football.lost],
            ] as const
          ).map(([count, label]) => (
            <Text key={label} size="meta" tone="muted">
              <Text size="meta" weight="semibold">
                {count}
              </Text>{" "}
              {label}
            </Text>
          ))}
          {view.allTime.bestRun ? (
            <Text size="meta" tone="muted">
              {view.allTime.bestRun}
            </Text>
          ) : null}
        </View>
      </Surface>

      <PartnersCard
        title={m.you.partners.teammates}
        meta={m.you.partners.mostPlayed}
        rows={partnerRows(teammates, "football", locale)}
        empty={m.you.partners.empty}
        onOpen={onOpenPlayer}
      />
    </View>
  );
}
