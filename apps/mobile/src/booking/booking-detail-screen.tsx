import { colors, sizes } from "@repo/design-tokens";
import {
  bookingStatusLabel,
  cancelWindowClosedMessage,
} from "@repo/domain/booking-copy";
import { formatGameClock } from "@repo/domain/format-game-start";
import { courtFace } from "@repo/domain/court-sport-copy";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { gameRatingScopeLabel } from "@repo/domain/game-rating-scope";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { useRouter, useSegments } from "expo-router";
import { Phone, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Share, View } from "react-native";

import { ConfirmSheet } from "../game-details/confirm-sheet";
import { useNow } from "../games/use-now";
import { gamePath } from "../games/games-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  bookingShareMessage,
  bookingsFallback,
  cancelConsequence,
  minutesBetween,
  paymentStatusLine,
  placeLine,
  untilLabel,
} from "./booking-model";
import { bookingGameBlurb, courtNounTitle } from "./book-sport";
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
  const m = useMessages();
  const locale = useLocale();
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
      toast.show(m.mobileBooking.detail.cancelledToast);
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
            title={m.mobileBooking.detail.loadError}
            description={booking.error.message}
            actionLabel={m.common.tryAgain}
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
          time={formatGameClock(data.startsAt, locale)}
          until={untilLabel(data.endsAt, locale)}
          subtitle={placeLine(
            data.startsAt,
            data.venue.name,
            data.court.name,
            now,
            locale,
          )}
          fallback={bookingsFallback(segments)}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {phone ? (
              <View style={{ flex: 1 }}>
                <Button
                  label={m.mobileBooking.detail.callVenue}
                  variant="outline-inverse"
                  icon={<Phone size={sizes.iconRow} color={colors.paper} />}
                  onPress={() => void Linking.openURL(`tel:${phone}`)}
                />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                label={m.common.share}
                variant="outline-inverse"
                icon={<Share2 size={sizes.iconRow} color={colors.paper} />}
                onPress={() =>
                  void Share.share({
                    message: bookingShareMessage(data, locale),
                  })
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
              label={m.mobileBooking.detail.cancelBooking}
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
          label={m.mobileBooking.courtMinutes(
            courtNounTitle(data.court.sport, locale),
            minutesBetween(data.startsAt, data.endsAt),
          )}
          first
        >
          <Text>{formatBookingPriceFils(data.priceFils, locale)}</Text>
        </DetailRow>
        <DetailRow label={m.mobileBooking.detail.payment}>
          <Text>
            {paymentStatusLine(data.paymentStatus, data.status, locale)}
          </Text>
        </DetailRow>
        {data.refundDueFils ? (
          <DetailRow label={m.mobileBooking.detail.refundDue}>
            <Text weight="semibold">
              {formatBookingPriceFils(data.refundDueFils, locale)}
            </Text>
          </DetailRow>
        ) : null}
      </Surface>

      <View>
        <DetailRow label={m.mobileBooking.status} first>
          <Text size="meta">{data.statusLabel}</Text>
        </DetailRow>
        <DetailRow label={m.mobileBooking.cancellation}>
          {live && data.cancel.allowed && data.cancel.nextStep?.text ? (
            <Text size="meta" style={{ textAlign: "right" }}>
              {data.cancel.nextStep.text}
            </Text>
          ) : live && !data.cancel.allowed ? (
            <Text size="meta" style={{ textAlign: "right" }}>
              {cancelWindowClosedMessage(phone, locale)}
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
          <DetailRow label={m.mobileBooking.venue}>
            <Text size="meta">{phone}</Text>
          </DetailRow>
        ) : null}
      </View>

      <ConfirmSheet
        request={
          confirming
            ? {
                title: m.mobileBooking.detail.cancelSheet.title,
                description: `${cancelConsequence(
                  {
                    paymentStatus: data.paymentStatus,
                    refundDueFilsNow: data.cancel.refundDueFilsNow,
                    refundPercentNow: data.cancel.refundPercentNow,
                  },
                  locale,
                )} ${m.mobileBooking.detail.cancelSheet.released[courtFace(data.court.sport)]}`,
                confirmLabel: m.mobileBooking.detail.cancelBooking,
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
  const m = useMessages();
  const locale = useLocale();
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
              {m.mobileBooking.detail.game}
            </Text>
            <Text weight="semibold">{gameDisplayName(game, locale)}</Text>
          </View>
          <Text size="meta" tone="muted">
            {gameRatingScopeLabel(game.ratingScope, locale)}
          </Text>
        </View>
        <Button
          label={m.mobileBooking.openGame}
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
          {m.mobileBooking.booked.whoIsPlaying}
        </Text>
        <Text size="meta" tone="muted">
          {game
            ? m.mobileBooking.detail.gameCancelled
            : bookingGameBlurb(booking.court.sport, locale)}
        </Text>
      </View>
      <Button label={m.mobileBooking.booked.createGame} onPress={onCreate} />
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
  const m = useMessages();
  const locale = useLocale();
  const detail = m.mobileBooking.detail;
  const face = courtFace(booking.court.sport);
  if (booking.status === "pending_payment") {
    const countdown = holdCountdown(booking.holdExpiresAt, now);
    return (
      <Notice
        title={countdown ? m.mobileBooking.finishPayment : detail.holdRanOut}
        description={
          countdown
            ? detail.heldFor[face](countdown)
            : detail.releasedUnpaid[face]
        }
        actionLabel={countdown ? m.mobileBooking.finishPayment : undefined}
        onAction={countdown ? onFinishPayment : undefined}
      />
    );
  }
  if (booking.status === "cancelled") {
    return (
      <Notice
        title={bookingStatusLabel("cancelled", locale)}
        description={
          booking.cancelledBy === "venue"
            ? detail.venueCancelled
            : detail.youCancelled
        }
      />
    );
  }
  if (booking.status === "no_show") {
    return <Notice title={detail.noShow} />;
  }
  if (booking.status === "expired") {
    return (
      <Notice title={detail.expired} description={detail.expiredDescription} />
    );
  }
  return null;
}
