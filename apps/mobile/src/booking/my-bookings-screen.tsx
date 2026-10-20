import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { useNow } from "../games/use-now";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { Notice } from "./booking-parts";
import { bookingPath, minutesBetween, relativeDay } from "./booking-model";
import {
  bookingsEmptyCopy,
  dayBlock,
  rowBadge,
  rowDetail,
  rowTitle,
  tabLabel,
  type BookingsTab,
} from "./my-bookings-model";

type BookingItem = RouterOutputs["bookings"]["listMine"]["items"][number];

const LIST_GAP = 12;
const DATE_BLOCK_WIDTH = 40;
const TAB_RULE = 2;

export function MyBookingsScreen() {
  const router = useRouter();
  const now = useNow();
  const [tab, setTab] = useState<BookingsTab>("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  const upcoming = api.bookings.listMine.useInfiniteQuery(
    { scope: "upcoming" },
    {
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      refetchOnWindowFocus: "always",
    },
  );
  const past = api.bookings.listMine.useInfiniteQuery(
    { scope: "past" },
    {
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      enabled: tab === "past",
    },
  );
  const active = tab === "upcoming" ? upcoming : past;
  const items = active.data?.pages.flatMap((page) => page.items);
  const upcomingCount = upcoming.data
    ? upcoming.data.pages.reduce((sum, page) => sum + page.items.length, 0)
    : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await active.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [active]);

  const loadMore = useCallback(() => {
    if (active.hasNextPage && !active.isFetchingNextPage) {
      void active.fetchNextPage();
    }
  }, [active]);

  const open = (item: BookingItem) =>
    router.push(
      item.status === "pending_payment"
        ? `${bookingPath(item.id)}/payment`
        : bookingPath(item.id),
    );
  const book = () => router.dismissTo("/book");

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} onNearEnd={loadMore}>
      <ScreenHeader title="My bookings" nav="back" fallback="/book">
        <Tabs
          tab={tab}
          onChange={setTab}
          upcomingLabel={tabLabel(
            "Upcoming",
            upcomingCount,
            upcoming.hasNextPage,
          )}
        />
      </ScreenHeader>

      {active.error && !items ? (
        <Notice
          title="Bookings could not be loaded"
          description={active.error.message}
          actionLabel="Try again"
          onAction={() => void active.refetch()}
        />
      ) : !items ? (
        <View style={{ gap: LIST_GAP }} accessibilityLabel="Loading bookings">
          <Skeleton height={180} radius={radii.surface} />
          <Skeleton height={76} radius={radii.surface} />
        </View>
      ) : items.length === 0 ? (
        <Surface style={{ gap: 4 }}>
          <Text size="lead" weight="semibold">
            {bookingsEmptyCopy(tab).title}
          </Text>
          <Text size="meta" tone="muted">
            {bookingsEmptyCopy(tab).description}
          </Text>
          {tab === "upcoming" ? (
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <Button label="Book a court" onPress={book} />
            </View>
          ) : null}
        </Surface>
      ) : (
        <View style={{ gap: LIST_GAP }}>
          {items.map((item, index) =>
            tab === "upcoming" && index === 0 ? (
              <NextBooking
                key={item.id}
                item={item}
                now={now}
                onPress={() => open(item)}
              />
            ) : (
              <BookingRowCard
                key={item.id}
                item={item}
                now={now}
                onPress={() => open(item)}
              />
            ),
          )}
          {active.isFetchNextPageError ? (
            <Notice
              title="More bookings could not be loaded"
              actionLabel="Try again"
              onAction={loadMore}
            />
          ) : active.hasNextPage ? (
            <View style={{ alignItems: "center" }}>
              <Button
                label="Load more"
                variant="outline"
                pending={active.isFetchingNextPage}
                onPress={loadMore}
              />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function Tabs({
  tab,
  onChange,
  upcomingLabel,
}: {
  tab: BookingsTab;
  onChange: (tab: BookingsTab) => void;
  upcomingLabel: string;
}) {
  const tabs = [
    { key: "upcoming", label: upcomingLabel },
    { key: "past", label: "Past" },
  ] as const;
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        gap: 24,
        borderBottomWidth: hairline,
        borderBottomColor: colors.rule,
      }}
    >
      {tabs.map((entry) => {
        const selected = entry.key === tab;
        return (
          <Pressable
            key={entry.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(entry.key)}
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
              {entry.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NextBooking({
  item,
  now,
  onPress,
}: {
  item: BookingItem;
  now: Date;
  onPress: () => void;
}) {
  const minutes = minutesBetween(item.startsAt, item.endsAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Next booking, ${relativeDay(item.startsAt, now)} ${formatGameClock(item.startsAt)}, ${item.court.name}, ${item.venue.name}, ${rowBadge(item, now)}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Surface tone="ink" style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {relativeDay(item.startsAt, now)}
          </Text>
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {`${item.court.name}, ${item.venue.name}`}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text size="display" width="expanded">
            {formatGameClock(item.startsAt)}
          </Text>
          <Text tone="muted">{`${minutes} min`}</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.slot,
              borderWidth: hairline,
              borderColor: colors.paper,
            }}
          >
            <Text size="eyebrow" mono uppercase>
              {rowBadge(item, now)}
            </Text>
          </View>
          <Text size="meta" weight="semibold">
            {formatBookingPriceFils(item.priceFils)}
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
}

function BookingRowCard({
  item,
  now,
  onPress,
}: {
  item: BookingItem;
  now: Date;
  onPress: () => void;
}) {
  const block = dayBlock(item.startsAt);
  const badge = rowBadge(item, now);
  const muted = item.status === "cancelled" || item.status === "no_show";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${block.weekday} ${block.day}, ${rowTitle(item)}, ${rowDetail(item)}, ${badge}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Surface
        padded={false}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: spacing.compact,
          paddingVertical: 16,
        }}
      >
        <View style={{ width: DATE_BLOCK_WIDTH, alignItems: "center" }}>
          <Text size="h2" weight="bold" tone={muted ? "muted" : "default"}>
            {block.day}
          </Text>
          <Text size="eyebrow" tone="muted">
            {block.weekday}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            weight="semibold"
            numberOfLines={1}
            tone={muted ? "muted" : "default"}
          >
            {rowTitle(item)}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {rowDetail(item)}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radii.slot,
            borderWidth: hairline,
            borderColor:
              item.status === "pending_payment" ? colors.ink : colors.rule,
          }}
        >
          <Text size="eyebrow">{badge}</Text>
        </View>
      </Surface>
    </Pressable>
  );
}
