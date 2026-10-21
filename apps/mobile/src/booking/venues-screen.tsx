import { colors, radii, spacing } from "@repo/design-tokens";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { venueCardImage } from "@repo/domain/venue-photos";
import { useRouter, useSegments } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNow } from "../games/use-now";
import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { slotOf } from "../lib/slot-of";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { SearchField } from "../primitives/search-field";
import { Section } from "../primitives/section";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { BookingRowCard, NextBooking, type BookingItem } from "./booking-cards";
import { Notice } from "./booking-parts";
import { bookingRowPath, venuePath } from "./booking-model";
import { VenueBanner } from "./venue-banner";
import {
  VENUE_SORTS,
  courtCountLabel,
  filterVenues,
  openToLabel,
  sortVenues,
  venueListMinHeight,
  venuesEmptyCopy,
  type VenueSort,
} from "./venues-model";

type BookableVenue = RouterOutputs["bookings"]["listBookableVenues"][number];

const BANNER_HEIGHT = 120;
const LIST_GAP = 12;
const FILTER_BAR_INDEX = 2;
// Padding keeps the pinned bar off the status bar and the cards under it;
// the matching negative margin keeps the resting gaps equal to other sections.
const FILTER_BAR_PADDING = 12;

export function VenuesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VenueSort>("name");
  const [refreshing, setRefreshing] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const venues = api.bookings.listBookableVenues.useQuery(
    {},
    { refetchOnWindowFocus: "always" },
  );
  const upcoming = api.bookings.listMine.useQuery(
    { scope: "upcoming" },
    { refetchOnWindowFocus: "always" },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([venues.refetch(), upcoming.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [venues, upcoming]);

  const slot = slotOf(venues);
  const shown =
    slot.status === "ready"
      ? sortVenues(filterVenues(slot.value, query), sort)
      : [];
  const listMinHeight = venueListMinHeight({
    viewportHeight,
    filterBarHeight,
    gap: spacing.section - FILTER_BAR_PADDING,
    paddingBottom: insets.bottom + spacing.section,
  });

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      stickyIndex={FILTER_BAR_INDEX}
      onViewportHeight={setViewportHeight}
    >
      <ScreenHeader title="Bookings" />
      <UpcomingBookings
        query={upcoming}
        onRetry={() => void upcoming.refetch()}
      />
      <View
        onLayout={({ nativeEvent }) =>
          setFilterBarHeight(nativeEvent.layout.height)
        }
        style={{
          marginHorizontal: -spacing.surface,
          marginVertical: -FILTER_BAR_PADDING,
          paddingHorizontal: spacing.surface,
          paddingVertical: FILTER_BAR_PADDING,
          backgroundColor: colors.paper,
        }}
      >
        {/* The sticky wrapper takes over this View's style, so the gap lives one level down. */}
        <View style={{ gap: 12 }}>
          <Text size="title" weight="semibold" accessibilityRole="header">
            Book a court
          </Text>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Area or venue"
            accessibilityLabel="Search area or venue"
            returnKeyType="search"
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {VENUE_SORTS.map((entry) => (
              <Button
                key={entry.key}
                label={entry.label}
                size="sm"
                variant={entry.key === sort ? "default" : "outline"}
                selected={entry.key === sort}
                onPress={() => setSort(entry.key)}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={{ minHeight: listMinHeight }}>
        {slot.status === "loading" ? (
          <View style={{ gap: LIST_GAP }} accessibilityLabel="Loading venues">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} height={200} radius={radii.surface} />
            ))}
          </View>
        ) : slot.status === "error" ? (
          <Notice
            title="Venues could not be loaded"
            description={slot.message}
            actionLabel="Try again"
            onAction={() => void onRefresh()}
          />
        ) : shown.length === 0 ? (
          <Notice {...venuesEmptyCopy(query)} />
        ) : (
          <View style={{ gap: LIST_GAP }}>
            {shown.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onPress={() => router.push(venuePath(venue.id))}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function UpcomingBookings({
  query,
  onRetry,
}: {
  query: { data?: { items: BookingItem[] }; error: { message: string } | null };
  onRetry: () => void;
}) {
  const router = useRouter();
  const segments = useSegments();
  const now = useNow();
  const items = query.data?.items;

  if (query.error && !items) {
    return (
      <Notice
        title="Upcoming bookings could not be loaded"
        description={query.error.message}
        actionLabel="Try again"
        onAction={onRetry}
      />
    );
  }
  if (!items) {
    return (
      <View accessibilityLabel="Loading upcoming bookings">
        <Skeleton height={180} radius={radii.surface} />
      </View>
    );
  }
  if (items.length === 0) {
    return null;
  }

  const open = (item: BookingItem) =>
    router.push(bookingRowPath(segments, item));

  return (
    <Section title="Upcoming">
      <View style={{ gap: LIST_GAP }}>
        {items.map((item, index) =>
          index === 0 ? (
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
      </View>
    </Section>
  );
}

function VenueCard({
  venue,
  onPress,
}: {
  venue: BookableVenue;
  onPress: () => void;
}) {
  const open = venue.todayOpen.length > 0;
  const price = formatBookingPriceFils(venue.fromHourlyRateFils);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, ${venue.city}, from ${price} an hour, ${openToLabel(venue.todayOpen)}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <VenueBanner image={venueCardImage(venue)} height={BANNER_HEIGHT}>
          <View
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.slot,
              borderWidth: hairline,
              borderColor: open ? colors.ink : colors.rule,
              backgroundColor: open ? colors.ink : colors.paper,
            }}
          >
            <Text
              size="eyebrow"
              mono
              style={{ color: open ? colors.paper : colors.muted }}
            >
              {openToLabel(venue.todayOpen)}
            </Text>
          </View>
        </VenueBanner>
        <View
          style={{
            padding: spacing.compact,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderTopWidth: hairline,
            borderTopColor: colors.rule,
          }}
        >
          <Avatar
            name={venue.name}
            uri={mediaUrl(venue.logoImageUrl, apiOrigin)}
            size="lg"
          />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                size="lead"
                weight="semibold"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {venue.name}
              </Text>
              <Text size="meta">
                <Text size="meta" tone="muted">
                  from{" "}
                </Text>
                <Text size="meta" weight="semibold">
                  {price}
                </Text>
                <Text size="meta" tone="muted">
                  /h
                </Text>
              </Text>
            </View>
            <Text size="meta" tone="muted" numberOfLines={1}>
              {`${venue.city} / ${courtCountLabel(venue.courtCount)}`}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}
