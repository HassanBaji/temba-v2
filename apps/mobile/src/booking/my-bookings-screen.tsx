import { colors, radii, sizes } from "@repo/design-tokens";
import { useRouter, useSegments } from "expo-router";
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
import { api } from "../trpc/react";
import { BookingRowCard, NextBooking, type BookingItem } from "./booking-cards";
import { Notice } from "./booking-parts";
import { bookingRowPath } from "./booking-model";
import {
  bookingsEmptyCopy,
  tabLabel,
  type BookingsTab,
} from "./my-bookings-model";

const LIST_GAP = 12;
const TAB_RULE = 2;

export function MyBookingsScreen() {
  const router = useRouter();
  const segments = useSegments();
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
    router.push(bookingRowPath(segments, item));
  const book = () => router.navigate("/book");

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh} onNearEnd={loadMore}>
      <ScreenHeader title="My bookings" nav="back" fallback="/profile">
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
