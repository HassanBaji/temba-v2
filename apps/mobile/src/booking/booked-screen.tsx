import { spacing } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLightStatusBar } from "../create-game/step-shell";
import { useNow } from "../games/use-now";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { bookingGameBlurb } from "./book-sport";
import {
  bookedHeadline,
  bookingGamePath,
  bookingPath,
  bookingRef,
} from "./booking-model";

type Booking = RouterOutputs["bookings"]["byId"];

export function BookedScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const booking = api.bookings.byId.useQuery({ bookingId });
  useLightStatusBar();

  return (
    <Surface
      tone="ink"
      padded={false}
      style={{ flex: 1, borderRadius: 0, paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.section,
          paddingTop: spacing.compact,
          paddingBottom: insets.bottom + spacing.surface,
          paddingHorizontal: spacing.surface,
        }}
      >
        <ScreenHeader
          nav="close"
          fallback="/book"
          onNav={() => router.dismissTo("/book")}
        />
        {booking.data ? (
          <Confirmation booking={booking.data} />
        ) : booking.error ? (
          <Text tone="muted">{booking.error.message}</Text>
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={96} />
            <Skeleton height={48} />
          </View>
        )}
        <View style={{ flex: 1 }} />
        {booking.data?.canCreateGame ? (
          <View style={{ gap: 10 }}>
            <Button
              label="Create a game for this booking"
              size="lg"
              variant="inverse"
              onPress={() => router.replace(bookingGamePath(bookingId))}
            />
            <Button
              label="Not now"
              size="lg"
              variant="outline-inverse"
              onPress={() => router.dismissTo("/book")}
            />
            <Text size="meta" tone="muted" style={{ textAlign: "center" }}>
              You can do this later from your booking.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Button
              label="View booking"
              size="lg"
              variant="inverse"
              onPress={() => router.replace(bookingPath(bookingId))}
            />
            <Button
              label="Done"
              size="lg"
              variant="outline-inverse"
              onPress={() => router.dismissTo("/book")}
            />
          </View>
        )}
      </ScrollView>
    </Surface>
  );
}

function Confirmation({ booking }: { booking: Booking }) {
  const now = useNow();
  const palette = useTonePalette();
  const price = formatBookingPriceFils(booking.priceFils);
  const paid = booking.paymentStatus === "paid";

  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: 14 }} accessibilityLiveRegion="polite">
        <Text size="eyebrow" mono uppercase tone="muted">
          {`Booked, ref ${bookingRef(booking.id)}`}
        </Text>
        <Text size="display" width="expanded" accessibilityRole="header">
          {bookedHeadline(booking.court.name, booking.startsAt, now)}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: 12,
          }}
        >
          <Text size="h1" width="expanded">
            {formatGameClock(booking.startsAt)}
          </Text>
          <Text tone="muted" style={{ flexShrink: 1 }}>
            {`to ${formatGameClock(booking.endsAt)}, ${booking.venue.name}`}
          </Text>
        </View>
        <Text size="meta" tone="muted">
          {paid ? `${price} paid.` : `${price} to pay at the venue.`}
        </Text>
      </View>
      <View
        style={{
          gap: 6,
          paddingTop: spacing.compact,
          borderTopWidth: hairline,
          borderTopColor: palette.rule,
        }}
      >
        <Text size="title" weight="bold" width="expanded">
          Cancellation
        </Text>
        <Text size="meta" tone="muted">
          {booking.cancel.nextStep?.text ??
            booking.cancellationPolicyLines.join(". ")}
        </Text>
        <Text size="meta" tone="muted">
          You can find this booking any time under Book.
        </Text>
      </View>
      {booking.canCreateGame ? (
        <View
          style={{
            gap: 6,
            paddingTop: spacing.compact,
            borderTopWidth: hairline,
            borderTopColor: palette.rule,
          }}
        >
          <Text size="title" weight="bold" width="expanded">
            Who is playing?
          </Text>
          <Text size="meta" tone="muted">
            {bookingGameBlurb(booking.court.sport)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
