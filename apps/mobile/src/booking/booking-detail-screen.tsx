import { colors, sizes } from "@repo/design-tokens";
import { cancelWindowClosedMessage } from "@repo/domain/booking-copy";
import {
  formatGameClock,
  formatGameStart,
} from "@repo/domain/format-game-start";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { useRouter, useSegments } from "expo-router";
import { Phone, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Share, View } from "react-native";

import { ConfirmSheet } from "../game-details/confirm-sheet";
import { useNow } from "../games/use-now";
import { gamePath } from "../games/games-model";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import { BookingHero, DetailRow, Notice } from "./booking-parts";
import {
  bookingGamePath,
  bookingPath,
  bookingRef,
  bookingsFallback,
  cancelConsequence,
  minutesBetween,
  paymentStatusLine,
  placeLine,
  untilLabel,
} from "./booking-model";
import { holdCountdown } from "./payment-model";

type Booking = RouterOutputs["bookings"]["byId"];

export function BookingDetailScreen({
  bookingId,
  returned,
}: {
  bookingId: string;
  returned: boolean;
}) {
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmedReturn = useRef(false);

  const booking = api.bookings.byId.useQuery(
    { bookingId },
    { refetchOnWindowFocus: "always" },
  );
  const confirmPayment = api.bookings.confirmPayment.useMutation({
    onSettled: () => void booking.refetch(),
  });
  const cancel = api.bookings.cancel.useMutation({
    onSuccess: async () => {
      setConfirming(false);
      toast.show("Booking cancelled");
      await Promise.all([
        booking.refetch(),
        utils.bookings.listMine.invalidate(),
        utils.bookings.venueAvailability.invalidate(),
      ]);
    },
    onError: (error) => {
      setConfirming(false);
      toast.show(error.message);
    },
  });

  useEffect(() => {
    if (
      returned &&
      !confirmedReturn.current &&
      booking.data?.status === "pending_payment"
    ) {
      confirmedReturn.current = true;
      confirmPayment.mutate({ bookingId });
    }
  }, [returned, booking.data?.status, bookingId, confirmPayment]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await booking.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [booking]);

  if (!booking.data) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={bookingsFallback(segments)} />
        {booking.error ? (
          <Notice
            title="Booking could not be loaded"
            description={booking.error.message}
            actionLabel="Try again"
            onAction={() => void booking.refetch()}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={160} />
            <Skeleton height={120} />
          </View>
        )}
      </Screen>
    );
  }

  const data = booking.data;
  const upcoming = data.endsAt.getTime() > now.getTime();
  const live =
    upcoming &&
    (data.status === "confirmed" || data.status === "pending_payment");
  const phone = data.venue.phone;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      statusBarTone="ink"
      header={
        <BookingHero
          eyebrow={bookingRef(data.id)}
          time={formatGameClock(data.startsAt)}
          until={untilLabel(data.endsAt)}
          subtitle={placeLine(
            data.startsAt,
            data.venue.name,
            data.court.name,
            now,
          )}
          fallback={bookingsFallback(segments)}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {phone ? (
              <View style={{ flex: 1 }}>
                <Button
                  label="Call venue"
                  variant="outline-inverse"
                  icon={<Phone size={sizes.iconRow} color={colors.paper} />}
                  onPress={() => void Linking.openURL(`tel:${phone}`)}
                />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                label="Share"
                variant="outline-inverse"
                icon={<Share2 size={sizes.iconRow} color={colors.paper} />}
                onPress={() =>
                  void Share.share({ message: shareMessage(data) })
                }
              />
            </View>
          </View>
        </BookingHero>
      }
      footer={
        live && data.cancel.allowed ? (
          <View style={{ flex: 1 }}>
            <Button
              label="Cancel booking"
              variant="outline"
              size="lg"
              onPress={() => setConfirming(true)}
            />
          </View>
        ) : undefined
      }
    >
      <StatusBlock
        booking={data}
        now={now}
        onFinishPayment={() => router.push(`${bookingPath(data.id)}/payment`)}
      />

      <GameBlock
        booking={data}
        onCreate={() => router.push(bookingGamePath(data.id))}
        onOpen={(gameId) => router.push(gamePath(gameId))}
      />

      <Surface padded={false} style={{ paddingHorizontal: 16 }}>
        <DetailRow
          label={`Court, ${minutesBetween(data.startsAt, data.endsAt)} min`}
          first
        >
          <Text>{formatBookingPriceFils(data.priceFils)}</Text>
        </DetailRow>
        <DetailRow label="Payment">
          <Text>{paymentStatusLine(data.paymentStatus, data.status)}</Text>
        </DetailRow>
        {data.refundDueFils ? (
          <DetailRow label="Refund due">
            <Text weight="semibold">
              {formatBookingPriceFils(data.refundDueFils)}
            </Text>
          </DetailRow>
        ) : null}
      </Surface>

      <View>
        <DetailRow label="Status" first>
          <Text size="meta">{data.statusLabel}</Text>
        </DetailRow>
        <DetailRow label="Cancellation">
          {live && data.cancel.allowed && data.cancel.nextStep?.text ? (
            <Text size="meta" style={{ textAlign: "right" }}>
              {data.cancel.nextStep.text}
            </Text>
          ) : live && !data.cancel.allowed ? (
            <Text size="meta" style={{ textAlign: "right" }}>
              {cancelWindowClosedMessage(phone)}
            </Text>
          ) : (
            data.cancellationPolicyLines.map((line) => (
              <Text key={line} size="meta" style={{ textAlign: "right" }}>
                {line}
              </Text>
            ))
          )}
        </DetailRow>
        {phone ? (
          <DetailRow label="Venue">
            <Text size="meta">{phone}</Text>
          </DetailRow>
        ) : null}
      </View>

      <ConfirmSheet
        request={
          confirming
            ? {
                title: "Cancel this booking?",
                description: `${cancelConsequence({
                  paymentStatus: data.paymentStatus,
                  refundDueFilsNow: data.cancel.refundDueFilsNow,
                  refundPercentNow: data.cancel.refundPercentNow,
                })} The court is released for others.`,
                confirmLabel: "Cancel booking",
                onConfirm: () => cancel.mutate({ bookingId }),
              }
            : null
        }
        pending={cancel.isPending}
        onClose={() => setConfirming(false)}
      />
    </Screen>
  );
}

function GameBlock({
  booking,
  onCreate,
  onOpen,
}: {
  booking: Booking;
  onCreate: () => void;
  onOpen: (gameId: string) => void;
}) {
  const game = booking.game;
  if (game && !game.cancelledAt) {
    return (
      <Surface style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexShrink: 1, gap: 2 }}>
            <Text size="eyebrow" mono uppercase tone="muted">
              Game
            </Text>
            <Text weight="semibold">{game.name ?? "Your game"}</Text>
          </View>
          <Text size="meta" tone="muted">
            {UNRATED_LABEL}
          </Text>
        </View>
        <Button
          label="Open game"
          variant="outline"
          onPress={() => onOpen(game.id)}
        />
      </Surface>
    );
  }
  if (!booking.canCreateGame) {
    return null;
  }
  return (
    <Surface style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text size="title" weight="bold" width="expanded">
          Who is playing?
        </Text>
        <Text size="meta" tone="muted">
          {game
            ? "Your game was cancelled. The court is still yours, so you can set up a new one."
            : "Turn the booking into a game and Temba handles seats, invites and the score."}
        </Text>
      </View>
      <Button label="Create a game for this booking" onPress={onCreate} />
    </Surface>
  );
}

function StatusBlock({
  booking,
  now,
  onFinishPayment,
}: {
  booking: Booking;
  now: Date;
  onFinishPayment: () => void;
}) {
  if (booking.status === "pending_payment") {
    const countdown = holdCountdown(booking.holdExpiresAt, now);
    return (
      <Notice
        title={countdown ? "Finish payment" : "Your hold ran out"}
        description={
          countdown
            ? `The court is held for you for ${countdown}.`
            : "The court was released because payment was not finished."
        }
        actionLabel={countdown ? "Finish payment" : undefined}
        onAction={countdown ? onFinishPayment : undefined}
      />
    );
  }
  if (booking.status === "cancelled") {
    return (
      <Notice
        title="Cancelled"
        description={
          booking.cancelledBy === "venue"
            ? "The venue cancelled this booking."
            : "You cancelled this booking."
        }
      />
    );
  }
  if (booking.status === "no_show") {
    return <Notice title="Marked as a no-show" />;
  }
  if (booking.status === "expired") {
    return (
      <Notice
        title="This booking expired"
        description="Payment was not finished in time."
      />
    );
  }
  return null;
}

function shareMessage(booking: Booking) {
  return `${booking.court.name} at ${booking.venue.name}, ${formatGameStart(booking.startsAt)} to ${formatGameClock(booking.endsAt)}`;
}
