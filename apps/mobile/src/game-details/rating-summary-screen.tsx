import { radii, sizes } from "@repo/design-tokens";
import {
  performanceRatingSummaryView,
  type RatingSummaryRow,
  type RatingSummarySide,
} from "@repo/domain/performance-rating";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, Scale } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { gamePath } from "../games/games-model";
import { useNow } from "../games/use-now";
import { groupMembersPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { Hero } from "./rate-game-screen";

const FIGURE_WIDTH = 40;
const ICON_TILE = 36;

function PlayerRow({ row }: { row: RatingSummaryRow }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={row.spoken}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
        backgroundColor: row.isViewer ? colors.wash : undefined,
      }}
    >
      <InitialsTile name={row.playerName} size="xs" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <Text
          size="eyebrow"
          tone={row.detailStrong ? "default" : "muted"}
          weight={row.detailStrong ? "semibold" : undefined}
          numberOfLines={1}
        >
          {row.detail}
        </Text>
      </View>
      <Text
        size="lead"
        weight="bold"
        width="expanded"
        style={{ width: FIGURE_WIDTH, textAlign: "right" }}
      >
        {row.rating}
      </Text>
      <Text
        weight="bold"
        width="expanded"
        tone="muted"
        style={{ width: FIGURE_WIDTH, textAlign: "right" }}
      >
        {row.points ?? ""}
      </Text>
    </View>
  );
}

function SideBlock({ side }: { side: RatingSummarySide }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const rows =
    side.previewCount === null || expanded
      ? side.rows
      : side.rows.slice(0, side.previewCount);
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
          {side.name}
        </Text>
        <Text size="meta" tone="muted">
          {side.aside}
        </Text>
      </View>
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {rows.map((row, index) => (
          <View key={row.key}>
            {index > 0 ? <Hairline /> : null}
            <PlayerRow row={row} />
          </View>
        ))}
        {side.moreLabel && !expanded ? (
          <>
            <Hairline />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: false }}
              onPress={() => setExpanded(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                minHeight: sizes.touchTarget,
              }}
            >
              <Text size="meta" weight="semibold">
                {side.moreLabel}
              </Text>
              <ChevronDown size={16} color={colors.ink} />
            </Pressable>
          </>
        ) : null}
      </Surface>
    </View>
  );
}

/**
 * The Organizer's summary once ratings are in (screen 4d): each player's
 * rating and points move, who changed tier, and whether a rater counted for
 * less, without names.
 */
export function RatingSummaryScreen({ gameId }: { gameId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const colors = useColors();
  const now = useNow();
  const query = api.games.performanceRatingSummary.useQuery({ gameId });
  const header = (
    <ScreenHeader
      nav="back"
      fallback={gamePath(gameId)}
      title={m.rating.performance.summary.title}
    />
  );

  if (!query.data) {
    return (
      <Screen>
        {header}
        {query.error ? (
          <Notice
            alert
            title={m.rating.performance.summary.loadFailed}
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <Skeleton height={140} radius={16} />
            <Skeleton height={320} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  const view = performanceRatingSummaryView(query.data, locale, now);
  if (view.kind === "pending") {
    return (
      <Screen>
        {header}
        <Notice title={view.title} description={view.description} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">{view.footer.title}</Text>
            <Text size="meta" tone="muted">
              {view.footer.description}
            </Text>
          </View>
          <Button
            label={view.footer.cta}
            size="lg"
            variant="outline"
            onPress={() => router.push(groupMembersPath(view.groupId))}
          />
        </View>
      }
    >
      {header}
      <Hero hero={view.hero} />
      {view.sides.map((side) => (
        <SideBlock key={side.slot} side={side} />
      ))}
      {view.outliers ? (
        <Surface
          accessible
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <View
            style={{
              width: ICON_TILE,
              height: ICON_TILE,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.md,
              borderWidth: hairline,
              borderColor: colors.rule,
            }}
          >
            <Scale size={16} color={colors.ink} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text weight="semibold">{view.outliers.title}</Text>
            <Text size="eyebrow" tone="muted">
              {view.outliers.description}
            </Text>
          </View>
        </Surface>
      ) : null}
    </Screen>
  );
}

export function RatingSummaryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RatingSummaryScreen gameId={id} />;
}
