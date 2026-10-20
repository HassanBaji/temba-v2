import { colors } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDayKey } from "@repo/domain/product-timezone";
import { useRouter } from "expo-router";
import type { BookingPaymentMethod } from "@repo/domain/booking-payment";
import { CreditCard, Smartphone, Store } from "lucide-react-native";
import { useState } from "react";
import { Platform, View } from "react-native";

import { FormErrorSummary } from "../auth/form-error-summary";
import { useNow } from "../games/use-now";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { BookingHero, Notice, SectionHeading } from "./booking-parts";
import {
  bookingPath,
  checkoutMethods,
  endsAfter,
  payButtonLabel,
  paymentMethod,
  refundTerms,
  untilLabel,
  venuePath,
  whenLine,
} from "./booking-model";
import { ChipGrid, ChipTile } from "./chip-grid";
import { courtChoices, keepOrFirst } from "./slot-grid";

const METHOD_ICONS = {
  card: CreditCard,
  benefit: CreditCard,
  benefitpay: Smartphone,
  apple_pay: Smartphone,
  at_venue: Store,
} satisfies Record<BookingPaymentMethod, unknown>;

const COURT_COLUMNS = 4;

export function CheckoutScreen({
  venueId,
  startsAtIso,
  durationMinutes: minutes,
}: {
  venueId: string;
  startsAtIso: string;
  durationMinutes: number;
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
  const [pickedCourt, setPickedCourt] = useState<string | null>(null);
  const [pickedMethod, setPickedMethod] = useState<BookingPaymentMethod | null>(
    null,
  );
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const venue = api.bookings.venueForBooking.useQuery({ venueId });
  const availability = api.bookings.venueAvailability.useQuery(
    { venueId, day },
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
        <ScreenHeader nav="back" fallback={venuePath(venueId)} />
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
    venueCourts: data.courts,
    courts: availability.data.courts,
  });
  const courtId = keepOrFirst(
    pickedCourt,
    courts.filter((court) => court.priceFils !== null).map((court) => court.id),
  );
  const court = courts.find((entry) => entry.id === courtId) ?? null;
  const freeCount = courts.filter((entry) => entry.priceFils !== null).length;
  const methods = checkoutMethods(data.payment, Platform.OS);
  const chosenMethod = keepOrFirst(pickedMethod, methods) ?? "at_venue";
  const terms = refundTerms(
    data.cancellationPolicy,
    data.cancellationPolicyLines,
    startsAt,
    now,
  );
  const ready = court !== null;

  return (
    <Screen
      header={
        <BookingHero
          eyebrow={data.name}
          time={formatGameClock(startsAt)}
          until={untilLabel(endsAfter(startsAt, minutes))}
          subtitle={whenLine(startsAt, minutes, now)}
          fallback={venuePath(venueId)}
        />
      }
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label={
              ready
                ? payButtonLabel(chosenMethod, court.name, court.priceFils ?? 0)
                : "No court free at this time"
            }
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
      {freeCount === 0 ? (
        <Notice
          title="This time was just taken"
          description={`No court is free for ${minutes} min at this time any more. Pick another time.`}
          actionLabel="Pick another time"
          onAction={() => router.back()}
        />
      ) : null}

      <View style={{ gap: 12 }}>
        <SectionHeading title="Court" meta={`${freeCount} free at this time`} />
        <ChipGrid columns={COURT_COLUMNS}>
          {courts.map((entry) => (
            <ChipTile
              key={entry.id}
              label={entry.name}
              sublabel={
                entry.priceFils === null
                  ? "Taken"
                  : formatBookingPriceFils(entry.priceFils)
              }
              struck={entry.priceFils === null}
              selected={entry.id === courtId}
              onPress={() => setPickedCourt(entry.id)}
            />
          ))}
        </ChipGrid>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeading title="Pay with" />
        {methods.map((method) => {
          const copy = paymentMethod(method);
          return (
            <ChoiceCard
              key={method}
              role="radio"
              variant="card"
              selected={method === chosenMethod}
              title={copy.title}
              description={copy.detail}
              leading={METHOD_ICONS[method]}
              onPress={() => setPickedMethod(method)}
            />
          );
        })}
      </View>

      {ready ? (
        <Surface style={{ gap: 8 }}>
          <SummaryRow
            label={`${court.name}, ${minutes} min`}
            value={formatBookingPriceFils(court.priceFils ?? 0)}
          />
          <View
            style={{
              borderTopWidth: hairline,
              borderTopColor: colors.rule,
              paddingTop: 8,
            }}
          >
            <SummaryRow
              label="Total"
              value={formatBookingPriceFils(court.priceFils ?? 0)}
              strong
            />
          </View>
          {terms ? (
            <Text size="eyebrow" tone="muted">
              {terms}
            </Text>
          ) : null}
        </Surface>
      ) : null}
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
    >
      <Text
        size={strong ? "lead" : "meta"}
        weight={strong ? "semibold" : "regular"}
        tone={strong ? "default" : "muted"}
      >
        {label}
      </Text>
      <Text
        size={strong ? "lead" : "meta"}
        weight={strong ? "semibold" : "regular"}
      >
        {value}
      </Text>
    </View>
  );
}
