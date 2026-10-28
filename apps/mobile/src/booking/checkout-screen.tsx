import { courtFace } from "@repo/domain/court-sport-copy";
import type { Sport } from "@repo/domain/sport";
import { colors, sizes } from "@repo/design-tokens";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDayKey } from "@repo/domain/product-timezone";
import { useRouter } from "expo-router";
import type { BookingPaymentMethod } from "@repo/domain/booking-payment";
import { ArrowRight, Lock } from "lucide-react-native";
import { useState } from "react";
import { Platform, View } from "react-native";

import { FormErrorSummary } from "../auth/form-error-summary";
import { useNow } from "../games/use-now";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { BookingHero, Notice, SectionHeading } from "./booking-parts";
import {
  bookingPath,
  checkoutMethods,
  payButtonLabel,
  paymentMethod,
  refundTerms,
  slotLine,
  venuePath,
} from "./booking-model";
import { PaymentMethodCard } from "./payment-method-card";
import { courtNounTitle } from "./book-sport";
import { courtChoices, keepOrFirst } from "./slot-grid";

export function CheckoutScreen({
  venueId,
  startsAtIso,
  durationMinutes: minutes,
  courtId,
  sport,
}: {
  venueId: string;
  startsAtIso: string;
  durationMinutes: number;
  courtId: string;
  sport: Sport;
}) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
  const startsAt = new Date(startsAtIso);
  const validStart =
    !Number.isNaN(startsAt.getTime()) &&
    Number.isInteger(minutes) &&
    minutes > 0;
  const day = validStart ? productDayKey(startsAt) : "";
  const [pickedMethod, setPickedMethod] = useState<BookingPaymentMethod | null>(
    null,
  );
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const venue = api.bookings.venueForBooking.useQuery({ venueId });
  const availability = api.bookings.venueAvailability.useQuery(
    { venueId, day, sport },
    { enabled: validStart },
  );

  const create = api.bookings.create.useMutation({
    onSuccess: async ({ booking, payment }) => {
      await Promise.all([
        utils.bookings.listMine.invalidate(),
        utils.bookings.venueAvailability.invalidate({ venueId }),
      ]);
      router.replace(
        payment.kind === "deferred"
          ? `${bookingPath(booking.id)}/booked`
          : `${bookingPath(booking.id)}/payment`,
      );
    },
    onError: async (error) => {
      if (error.data?.code === "CONFLICT") {
        toast.show(error.message);
        await utils.bookings.venueAvailability.invalidate({ venueId });
        router.back();
        return;
      }
      setFormMessage(error.message);
    },
  });

  if (!venue.data || !availability.data) {
    const error = venue.error ?? availability.error;
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={venuePath(venueId, sport)} />
        {!validStart ? (
          <Notice
            title="That time is not valid"
            description="Pick a time again."
          />
        ) : error ? (
          <Notice
            title="Checkout could not be loaded"
            description={error.message}
            actionLabel="Try again"
            onAction={() => {
              void venue.refetch();
              void availability.refetch();
            }}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        )}
      </Screen>
    );
  }

  const data = venue.data;
  const courts = courtChoices({
    startsAt,
    minutes,
    venueCourts: data.courts.filter((entry) => entry.sport === sport),
    courts: availability.data.courts,
  });
  const court =
    courts.find((entry) => entry.id === courtId && entry.priceFils !== null) ??
    null;
  const courtName = courts.find((entry) => entry.id === courtId)?.name;
  const methods = checkoutMethods(data.payment, Platform.OS);
  const chosenMethod = keepOrFirst(pickedMethod, methods) ?? "at_venue";
  const terms = refundTerms(
    data.cancellationPolicy,
    data.cancellationPolicyLines,
    startsAt,
    now,
  );
  const ready = court !== null;
  const note = [terms, "Split with players after you book."]
    .filter(Boolean)
    .join(" ");

  return (
    <Screen
      statusBarTone="ink"
      header={
        <BookingHero
          eyebrow={data.name}
          time={courtName ?? courtNounTitle(sport)}
          titleSize="h1Lg"
          subtitle={slotLine(startsAt, minutes, now)}
          fallback={venuePath(venueId, sport)}
        />
      }
      footer={
        <View style={{ flex: 1, gap: 16 }}>
          {ready ? (
            <View style={{ gap: 10, paddingTop: 12 }}>
              <SummaryRow
                label={`${court.name}, ${minutes} min`}
                value={formatBookingPriceFils(court.priceFils ?? 0)}
              />
              <SummaryRow
                label="Booking fee"
                value={formatBookingPriceFils(0)}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  paddingTop: 12,
                  borderTopWidth: hairline,
                  borderTopColor: colors.rule,
                }}
              >
                <Text weight="semibold">Total</Text>
                <Text size="figure" weight="semibold">
                  {formatBookingPriceFils(court.priceFils ?? 0)}
                </Text>
              </View>
              <Text size="eyebrow" tone="muted">
                {note}
              </Text>
            </View>
          ) : null}
          <Button
            label={
              ready
                ? payButtonLabel(chosenMethod, court.priceFils ?? 0)
                : `${courtNounTitle(sport)} not free at this time`
            }
            icon={
              ready ? (
                <ArrowRight size={sizes.iconRow} color={colors.paper} />
              ) : undefined
            }
            iconPlacement="trailing"
            size="lg"
            disabled={!ready}
            pending={create.isPending}
            onPress={() => {
              if (!ready) {
                return;
              }
              setFormMessage(null);
              create.mutate({
                venueId,
                courtId: court.id,
                startsAt,
                durationMinutes: minutes,
                paymentMethod: chosenMethod,
              });
            }}
          />
        </View>
      }
    >
      <FormErrorSummary message={formMessage} />
      {ready ? null : (
        <Notice
          title={
            courtName
              ? `${courtName} was just taken`
              : `This ${courtFace(sport)} was not found`
          }
          description={`It is not free for ${minutes} min at this time any more. Pick another ${courtFace(sport)} or time.`}
          actionLabel="Pick again"
          onAction={() => router.back()}
        />
      )}

      <View style={{ gap: 12 }}>
        <SectionHeading
          title="Pay with"
          meta="Secure checkout"
          metaIcon={Lock}
        />
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {methods.map((method) => {
            const copy = paymentMethod(method);
            return (
              <PaymentMethodCard
                key={method}
                method={method}
                title={copy.title}
                description={copy.detail}
                selected={method === chosenMethod}
                onPress={() => setPickedMethod(method)}
              />
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
    >
      <Text size="meta" tone="muted" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Text size="meta">{value}</Text>
    </View>
  );
}
