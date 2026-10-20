import { colors, radii, spacing } from "@repo/design-tokens";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { venueCardImage } from "@repo/domain/venue-photos";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { slotOf } from "../lib/slot-of";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { SearchField } from "../primitives/search-field";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { Notice } from "./booking-parts";
import { venuePath } from "./booking-model";
import { VenueBanner } from "./venue-banner";
import {
  VENUE_SORTS,
  courtCountLabel,
  filterVenues,
  openToLabel,
  sortVenues,
  venuesEmptyCopy,
  type VenueSort,
} from "./venues-model";

type BookableVenue = RouterOutputs["bookings"]["listBookableVenues"][number];

const BANNER_HEIGHT = 120;
const LIST_GAP = 12;

export function VenuesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VenueSort>("name");
  const [refreshing, setRefreshing] = useState(false);
  const venues = api.bookings.listBookableVenues.useQuery(
    {},
    { refetchOnWindowFocus: "always" },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await venues.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [venues]);

  const slot = slotOf(venues);
  const shown =
    slot.status === "ready"
      ? sortVenues(filterVenues(slot.value, query), sort)
      : [];

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        title="Book a court"
        actions={
          <Button
            label="My bookings"
            size="sm"
            variant="outline"
            onPress={() => router.push("/book/bookings")}
          />
        }
      >
        <View style={{ gap: 12 }}>
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
      </ScreenHeader>
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
    </Screen>
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
            gap: 4,
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
      </Surface>
    </Pressable>
  );
}
