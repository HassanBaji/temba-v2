import { radii, spacing } from "@repo/design-tokens";
import { fishSizes } from "@repo/design-tokens/fish";
import {
  performanceResultView,
  type PerformanceResultRow,
  type PerformanceResultView,
} from "@repo/domain/performance-rating";
import { Star } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { TierFish } from "../groups/tier-fish";
import { useLocale } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";

type RatingWindow = RouterOutputs["games"]["byId"]["ratingWindow"];
type SettledView = Extract<PerformanceResultView, { kind: "settled" }>;

const DIMMED_FISH = 0.18;
const MVP_TILE = 36;
const MVP_ICON = 16;
const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

/**
 * Screen 4c on a played Game: once the Rating window closes, the viewer's
 * rating and what it did to their tier points; before that, when it arrives.
 */
export function PerformanceResultCard({
  gameId,
  window,
}: {
  gameId: string;
  window: RatingWindow;
}) {
  const locale = useLocale();
  const now = useNow();
  const query = api.games.performanceRatingResult.useQuery(
    { gameId },
    { ...REFETCH_ON_FOREGROUND, enabled: window !== null },
  );
  const { refetch } = query;
  const windowState = window?.state;
  const shownState = useRef(windowState);
  useEffect(() => {
    if (shownState.current !== windowState) {
      shownState.current = windowState;
      void refetch();
    }
  }, [windowState, refetch]);

  if (!window || !query.data) {
    return null;
  }
  const view = performanceResultView(query.data, locale, {
    viewerMayRate: window.viewerMayRate,
    now,
  });
  if (!view) {
    return null;
  }
  if (view.kind === "pending") {
    return (
      <Surface style={{ gap: 2 }}>
        <Text weight="semibold">{view.title}</Text>
        <Text size="meta" tone="muted">
          {view.description}
        </Text>
      </Surface>
    );
  }
  return <SettledResult view={view} />;
}

function SettledResult({ view }: { view: SettledView }) {
  return (
    <View style={{ gap: spacing.section }}>
      <Surface style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {view.gameLine}
          </Text>
          {view.scoreLine ? (
            <Text size="meta" tone="muted">
              {view.scoreLine}
            </Text>
          ) : null}
        </View>
        {view.rating ? (
          <>
            <View
              accessible
              accessibilityLabel={view.rating.spoken}
              style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
            >
              <Text size="record" weight="bold" width="expanded">
                {view.rating.value}
              </Text>
              <Text tone="muted">{view.rating.ofTen}</Text>
            </View>
            <Hairline />
            <Text size="meta" tone="muted">
              {view.rating.note}
            </Text>
          </>
        ) : null}
      </Surface>

      <Section title={view.points.title} aside={view.points.aside}>
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {view.points.rows.map((row, index) => (
            <View key={row.title}>
              {index > 0 ? <Hairline /> : null}
              <PointsRow row={row} />
            </View>
          ))}
          <Hairline />
          <PointsRow row={view.points.total} total />
        </Surface>
      </Section>

      <Section title={view.tier.title} aside={view.tier.aside}>
        <Surface style={{ gap: 12 }}>
          <FishTrack tier={view.tier} />
          <Text size="meta" tone="muted">
            {view.tier.line}
          </Text>
        </Surface>
      </Section>

      {view.mvp ? <MvpResult mvp={view.mvp} /> : null}

      <Text size="meta" tone="muted">
        {view.footnote}
      </Text>
    </View>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="title" weight="semibold" accessibilityRole="header">
          {title}
        </Text>
        {aside ? (
          <Text size="meta" tone="muted">
            {aside}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function PointsRow({
  row,
  total = false,
}: {
  row: PerformanceResultRow;
  total?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${row.spoken}. ${row.detail}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: total ? colors.wash : undefined,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{row.title}</Text>
        <Text size="meta" tone="muted">
          {row.detail}
        </Text>
      </View>
      <Text size={total ? "h2" : "lead"} weight="bold" width="expanded">
        {row.delta}
      </Text>
    </View>
  );
}

function FishTrack({ tier }: { tier: SettledView["tier"] }) {
  if (tier.provisional) {
    const { height } = fishSizes.row;
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={tier.aside}
        style={{ height }}
      >
        <Hatch />
      </View>
    );
  }
  if (!tier.track) {
    return null;
  }
  const current = tier.track.find((fish) => fish.current);
  return (
    <View
      accessible
      accessibilityLabel={
        current ? `${tier.title}. ${current.label}` : tier.title
      }
      style={{ flexDirection: "row", gap: 4 }}
    >
      {tier.track.map((fish) => (
        <View
          key={fish.band}
          style={{
            flex: 1,
            alignItems: "center",
            gap: 6,
            opacity: fish.current ? 1 : DIMMED_FISH,
          }}
        >
          <TierFish band={fish.band} label={fish.label} />
          <Text size="eyebrow" weight={fish.current ? "semibold" : "regular"}>
            {fish.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MvpResult({ mvp }: { mvp: NonNullable<SettledView["mvp"]> }) {
  const colors = useColors();
  return (
    <Surface style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: MVP_TILE,
          height: MVP_TILE,
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: colors.rule,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Star size={MVP_ICON} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{mvp.title}</Text>
        {mvp.detail ? (
          <Text size="meta" tone="muted">
            {mvp.detail}
          </Text>
        ) : null}
      </View>
    </Surface>
  );
}
