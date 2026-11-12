import AsyncStorage from "@react-native-async-storage/async-storage";
import { radii, sizes, spacing } from "@repo/design-tokens";
import { type Sport } from "@repo/domain/sport";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { venueCardImage } from "@repo/domain/venue-photos";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { History } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { SportSegments } from "../lib/sport-segments";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { SearchField } from "../primitives/search-field";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";
import { BookingRowCard, NextBooking, type BookingItem } from "./booking-cards";
import { Notice } from "./booking-parts";
import { bookingRowPath, venuePath } from "./booking-model";
import {
  bookTitle,
  readBookSport,
  sportFromParam,
  writeBookSport,
} from "./book-sport";
import { countLabel } from "./my-bookings-model";
import { VenueBanner } from "./venue-banner";
import {
  courtCountLabel,
  filterVenues,
  openToLabel,
  sortVenues,
  venueListMinHeight,
  venueSorts,
  venuesEmptyCopy,
  type VenueSort,
} from "./venues-model";

type BookableVenue = RouterOutputs["bookings"]["listBookableVenues"][number];

const PAST_BOOKINGS_PATH = "/book/bookings?tab=past";

const BANNER_HEIGHT = 120;
const LIST_GAP = 14;
const SORT_CHIP_HEIGHT = 30;
const FILTER_BAR_INDEX = 2;
// Padding keeps the pinned bar off the status bar and the cards under it;
// the matching negative margin keeps the resting gaps equal to other sections.
const FILTER_BAR_PADDING = 12;

export function VenuesScreen() {
  const router = useRouter();
  const m = useMessages();
  const colors = useColors();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VenueSort>("name");
  const [sport, setSport] = useState<Sport>("padel");
  const [refreshing, setRefreshing] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const chosen = useRef(false);
  useEffect(() => {
    let live = true;
    void readBookSport(AsyncStorage).then((stored) => {
      if (live && !chosen.current) {
        setSport(stored);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  const chooseSport = useCallback((next: Sport) => {
    chosen.current = true;
    setSport(next);
    void writeBookSport(AsyncStorage, next);
  }, []);
  const params = useLocalSearchParams<{ sport?: string }>();
  useEffect(() => {
    if (params.sport) {
      chooseSport(sportFromParam(params.sport));
    }
  }, [params.sport, chooseSport]);
  const venues = api.bookings.listBookableVenues.useQuery(
    { sport },
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
      <ScreenHeader
        title={m.mobileBooking.title}
        actions={
          <Button
            label={m.mobileBooking.past}
            accessibilityLabel={m.mobileBooking.pastBookings}
            size="sm"
            variant="outline"
            icon={<History size={sizes.iconRow} color={colors.ink} />}
            onPress={() => router.push(PAST_BOOKINGS_PATH)}
          />
        }
      />
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
        <View style={{ gap: 10 }}>
          <SectionHead
            title={bookTitle(sport, locale)}
            count={
              slot.status === "ready"
                ? countLabel(shown.length, {
                    exact: m.mobileBooking.count.venues,
                    orMore: m.mobileBooking.count.venuesOrMore,
                  })
                : null
            }
          />
          <SportSegments value={sport} onSelect={chooseSport} />
          <SearchField
            value={query}
            onChangeText={setQuery}
            tone="wash"
            placeholder={m.mobileBooking.venues.searchPlaceholder}
            accessibilityLabel={m.mobileBooking.venues.searchLabel}
            returnKeyType="search"
          />
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={m.mobileBooking.venues.sortLabel}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Text size="eyebrow" tone="muted" style={{ marginEnd: 4 }}>
              {m.mobileBooking.sort.label}
            </Text>
            {venueSorts(locale).map((entry) => (
              <SortChip
                key={entry.key}
                label={entry.label}
                selected={entry.key === sort}
                onPress={() => setSort(entry.key)}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={{ minHeight: listMinHeight }}>
        {slot.status === "loading" ? (
          <View
            style={{ gap: LIST_GAP }}
            accessibilityLabel={m.mobileBooking.venues.loading}
          >
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} height={200} radius={radii.surface} />
            ))}
          </View>
        ) : slot.status === "error" ? (
          <Notice
            title={m.mobileBooking.venues.loadError}
            description={slot.message}
            actionLabel={m.common.tryAgain}
            onAction={() => void onRefresh()}
          />
        ) : shown.length === 0 ? (
          <Notice {...venuesEmptyCopy(query, locale, sport)} />
        ) : (
          <View style={{ gap: LIST_GAP }}>
            {shown.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                sport={sport}
                onPress={() => router.push(venuePath(venue.id, sport))}
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
  query: {
    data?: { items: BookingItem[]; nextCursor: unknown };
    error: { message: string } | null;
  };
  onRetry: () => void;
}) {
  const router = useRouter();
  const segments = useSegments();
  const now = useNow();
  const m = useMessages();
  const items = query.data?.items;

  if (query.error && !items) {
    return (
      <Notice
        title={m.mobileBooking.venues.upcomingLoadError}
        description={query.error.message}
        actionLabel={m.common.tryAgain}
        onAction={onRetry}
      />
    );
  }
  if (!items) {
    return (
      <View accessibilityLabel={m.mobileBooking.venues.loadingUpcoming}>
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
    <View style={{ gap: 12 }}>
      <SectionHead
        title={m.mobileBooking.upcoming}
        count={countLabel(
          items.length,
          {
            exact: m.mobileBooking.count.bookings,
            orMore: m.mobileBooking.count.bookingsOrMore,
          },
          query.data?.nextCursor != null,
        )}
      />
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
    </View>
  );
}

function VenueCard({
  venue,
  sport,
  onPress,
}: {
  venue: BookableVenue;
  sport: Sport;
  onPress: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const locale = useLocale();
  const open = venue.todayOpen.length > 0;
  const price = formatBookingPriceFils(venue.fromHourlyRateFils, locale);
  const cardLabel = m.mobileBooking.venues.cardLabel(
    venue.name,
    venue.city,
    price,
    openToLabel(venue.todayOpen, locale),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        venue.isPartner
          ? m.mobileBooking.venues.partnerCardLabel(cardLabel)
          : cardLabel
      }
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        <VenueBanner image={venueCardImage(venue)} height={BANNER_HEIGHT}>
          <View
            style={{
              position: "absolute",
              end: 12,
              bottom: 12,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radii.slot,
              borderWidth: hairline,
              borderColor: colors.rule,
              backgroundColor: colors.paper,
            }}
          >
            <Text size="eyebrow" tone={open ? "default" : "muted"}>
              {openToLabel(venue.todayOpen, locale)}
            </Text>
          </View>
        </VenueBanner>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 16,
            gap: 6,
            borderTopWidth: hairline,
            borderTopColor: colors.rule,
          }}
        >
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
                {m.mobileBooking.venues.fromPrefix}{" "}
              </Text>
              {price}
              <Text size="meta" tone="muted">
                {m.mobileBooking.venues.perHour}
              </Text>
            </Text>
          </View>
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {venue.city}
            <Text size="eyebrow" style={{ color: colors.rule }}>
              {"  /  "}
            </Text>
            {courtCountLabel(venue.courtCount, locale, sport)}
            {venue.isPartner ? (
              <>
                <Text size="eyebrow" style={{ color: colors.rule }}>
                  {"  /  "}
                </Text>
                <Text size="eyebrow">{m.mobileBooking.venues.partner}</Text>
              </>
            ) : null}
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
}

function SectionHead({
  title,
  count,
}: {
  title: string;
  count: string | null;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text
        size="title"
        weight="semibold"
        accessibilityRole="header"
        style={{ flexShrink: 1 }}
      >
        {title}
      </Text>
      {count ? (
        <Text size="eyebrow" mono uppercase tone="muted">
          {count}
        </Text>
      ) : null}
    </View>
  );
}

function SortChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      hitSlop={(sizes.touchTarget - SORT_CHIP_HEIGHT) / 2}
      onPress={onPress}
      style={({ pressed }) => ({
        height: SORT_CHIP_HEIGHT,
        paddingHorizontal: 10,
        justifyContent: "center",
        borderRadius: radii.sm,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.rule,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text size="eyebrow" tone={selected ? "default" : "muted"}>
        {label}
      </Text>
    </Pressable>
  );
}
