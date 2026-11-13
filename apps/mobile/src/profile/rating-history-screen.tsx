import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  ratingHistoryScreen,
  type RatingHistoryIcon,
  type RatingHistoryLadder,
  type RatingHistoryLine,
  type RatingHistoryScreen,
} from "@repo/domain/rating-history";
import { isSport, type Sport } from "@repo/domain/sport";
import { useLocalSearchParams } from "expo-router";
import { BadgeCheck, PenLine, UserCheck } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import { TierFish } from "../groups/tier-fish";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { ratingsPath } from "./ratings-screen";

const PAGE_SIZE = 20;
const TAB_RULE = 2;
const ICON_TILE = 38;

function LineIcon({ icon }: { icon: RatingHistoryIcon }) {
  const colors = useColors();
  let glyph: React.ReactNode;
  if (icon.kind === "tier") {
    glyph =
      icon.band && icon.label ? (
        <TierFish band={icon.band} label={icon.label} />
      ) : (
        <View style={{ width: 27, height: 16 }}>
          <Hatch />
        </View>
      );
  } else {
    const Icon = icon.kind === "override" ? UserCheck : BadgeCheck;
    glyph = <Icon size={sizes.iconRow + 1} color={colors.ink} />;
  }
  return (
    <View
      style={{
        minWidth: ICON_TILE,
        height: ICON_TILE,
        paddingHorizontal: icon.kind === "tier" ? 4 : 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.card - 3,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      {glyph}
    </View>
  );
}

function Line({ line }: { line: RatingHistoryLine }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={line.spoken}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
      }}
    >
      <LineIcon icon={line.icon} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="meta" weight="semibold">
          {line.title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {line.detail}
        </Text>
        {line.byline ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 7,
              marginTop: 4,
            }}
          >
            <View style={{ paddingTop: 2 }}>
              <PenLine size={sizes.iconRow - 4} color={colors.muted} />
            </View>
            <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
              {line.byline}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text weight="bold" width="expanded" ltr>
          {line.delta}
        </Text>
        <Text size="eyebrow" tone="muted" ltr>
          {line.after}
        </Text>
      </View>
    </View>
  );
}

function Filters({
  screen,
  value,
  onSelect,
}: {
  screen: RatingHistoryScreen;
  value: RatingHistoryLadder;
  onSelect: (ladder: RatingHistoryLadder) => void;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={screen.filterLabel}
      style={{
        flexDirection: "row",
        gap: 22,
        borderBottomWidth: hairline,
        borderBottomColor: colors.rule,
      }}
    >
      {screen.filters.map((filter) => {
        const selected = filter.value === value;
        return (
          <Pressable
            key={filter.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(filter.value)}
            style={{
              minHeight: sizes.touchTarget,
              justifyContent: "center",
              borderBottomWidth: TAB_RULE,
              borderBottomColor: selected ? colors.ink : "transparent",
              marginBottom: -hairline,
            }}
          >
            <Text
              weight={selected ? "semibold" : "regular"}
              tone={selected ? "default" : "muted"}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Empty({
  empty,
}: {
  empty: NonNullable<RatingHistoryScreen["empty"]>;
}) {
  if (empty.reserved) {
    return (
      <View
        accessible
        accessibilityLabel={empty.text}
        style={{
          minHeight: 72,
          borderRadius: radii.card,
          overflow: "hidden",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Hatch radius={radii.card} />
        <Text size="meta" weight="semibold">
          {empty.text}
        </Text>
      </View>
    );
  }
  return (
    <Surface radius="card">
      <Text size="meta" tone="muted">
        {empty.text}
      </Text>
    </Surface>
  );
}

/**
 * Rating history (screen 1c): every move of the viewer's Level and Group
 * Tiers on one sport, newest first under This week and then each month,
 * manual changes with who and why. The Rank filter is reserved and empty.
 */
export function RatingHistoryView({ sport }: { sport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  const [ladder, setLadder] = useState<RatingHistoryLadder>("all");
  const history = api.ratings.history.useInfiniteQuery(
    { sport, ladder, limit: PAGE_SIZE },
    {
      enabled: ladder !== "rank",
      refetchOnWindowFocus: "always",
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    },
  );
  const first = history.data?.pages[0];
  const items = useMemo(
    () => history.data?.pages.flatMap((page) => page.entries) ?? [],
    [history.data],
  );
  const screen = ratingHistoryScreen(
    {
      ladder,
      sport,
      items,
      viewerUserId: first?.viewerUserId ?? "",
      now: new Date(),
    },
    locale,
  );
  const loading = ladder !== "rank" && !first;

  let body: React.ReactNode;
  if (loading && history.error) {
    body = (
      <Notice
        alert
        title={m.rating.ratingHistory.loadFailed}
        description={history.error.message}
        onRetry={() => void history.refetch()}
      />
    );
  } else if (loading) {
    body = (
      <>
        <Skeleton height={240} radius={radii.card} />
        <Skeleton height={160} radius={radii.card} />
      </>
    );
  } else if (screen.empty) {
    body = <Empty empty={screen.empty} />;
  } else {
    body = (
      <>
        {screen.sections.map((section) => (
          <View key={section.key} style={{ gap: 8 }}>
            <Text size="eyebrow" tone="muted" accessibilityRole="header">
              {section.title}
            </Text>
            <Surface
              padded={false}
              radius="card"
              style={{ overflow: "hidden" }}
            >
              {section.lines.map((line, index) => (
                <View key={line.key}>
                  {index > 0 ? <Hairline /> : null}
                  <Line line={line} />
                </View>
              ))}
            </Surface>
          </View>
        ))}
        {history.hasNextPage ? (
          <View style={{ alignItems: "center" }}>
            <Button
              label={m.common.showMore}
              variant="outline"
              pending={history.isFetchingNextPage}
              onPress={() => void history.fetchNextPage()}
            />
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen
      refreshing={history.isRefetching && !history.isFetchingNextPage}
      onRefresh={() => void history.refetch()}
    >
      <ScreenHeader
        nav="back"
        fallback={ratingsPath(sport)}
        title={screen.title}
      >
        <Filters screen={screen} value={ladder} onSelect={setLadder} />
      </ScreenHeader>
      <View style={{ gap: spacing.surface + 2 }}>{body}</View>
      <Text size="eyebrow" tone="muted">
        {screen.footnote}
      </Text>
    </Screen>
  );
}

export function RatingHistoryRoute() {
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  return <RatingHistoryView sport={isSport(sport) ? sport : "padel"} />;
}
