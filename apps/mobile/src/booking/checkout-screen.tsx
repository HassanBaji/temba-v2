import { colors, sizes } from "@repo/design-tokens";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDayKey } from "@repo/domain/product-timezone";
import { useRouter } from "expo-router";
import { Check, CreditCard, Store } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { FormErrorSummary } from "../auth/form-error-summary";
import { useNow } from "../games/use-now";
import { Button } from "../primitives/button";
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
  payButtonLabel,
  paymentMethod,
  refundTerms,
  untilLabel,
  venuePath,
  whenLine,
} from "./booking-model";
import { ChipGrid, ChipTile } from "./chip-grid";
import { courtChoices, durationChoices, keepOrFirst } from "./slot-grid";

const COURT_COLUMNS = 4;
const DURATION_COLUMNS = 3;

export function CheckoutScreen({
  venueId,
  startsAtIso,
}: {
  venueId: string;
  startsAtIso: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
  const startsAt = new Date(startsAtIso);
  const validStart = !Number.isNaN(startsAt.getTime());
  const day = validStart ? productDayKey(startsAt) : "";
  const [pickedMinutes, setPickedMinutes] = useState<number | null>(null);
  const [pickedCourt, setPickedCourt] = useState<string | null>(null);
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
  const durations = durationChoices({
    startsAt,
    options: data.durationOptionsMinutes,
    courts: availability.data.courts,
  });
  const minutes = keepOrFirst(
    pickedMinutes,
    durations
      .filter((entry) => entry.freeCourts > 0)
      .map((entry) => entry.minutes),
  );
  const duration = durations.find((entry) => entry.minutes === minutes) ?? null;
  const courts =
    minutes === null
      ? []
      : courtChoices({
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
  const method = paymentMethod(data.payment.mode);
  const terms = refundTerms(
    data.cancellationPolicy,
    data.cancellationPolicyLines,
    startsAt,
    now,
  );
  const ready = court !== null && minutes !== null;

  return (
    <Screen
      header={
        <BookingHero
          eyebrow={data.name}
          time={formatGameClock(startsAt)}
          until={duration ? untilLabel(duration.endsAt) : ""}
          subtitle={whenLine(startsAt, minutes ?? 0, now)}
          fallback={venuePath(venueId)}
        />
      }
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label={
              ready
                ? payButtonLabel(
                    data.payment.mode,
                    court.name,
                    court.priceFils ?? 0,
                  )
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
              });
            }}
          />
        </View>
      }
    >
      <FormErrorSummary message={formMessage} />
      {minutes === null ? (
        <Notice
          title="This time was just taken"
          description="No court is free at this time any more. Pick another time."
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
        <SectionHeading
          title="Duration"
          meta={duration ? `Ends ${formatGameClock(duration.endsAt)}` : null}
        />
        <ChipGrid columns={DURATION_COLUMNS}>
          {durations.map((entry) => (
            <ChipTile
              key={entry.minutes}
              label={`${entry.minutes} min`}
              struck={entry.freeCourts === 0}
              selected={entry.minutes === minutes}
              onPress={() => setPickedMinutes(entry.minutes)}
            />
          ))}
        </ChipGrid>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeading title="Pay with" />
        <Surface
          padded={false}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          {data.payment.mode === "online" ? (
            <CreditCard size={sizes.iconAction} color={colors.ink} />
          ) : (
            <Store size={sizes.iconAction} color={colors.ink} />
          )}
          <View style={{ flex: 1 }}>
            <Text weight="medium">{method.title}</Text>
            <Text size="meta" tone="muted">
              {method.detail}
            </Text>
          </View>
          <Check
            size={sizes.iconAction}
            color={colors.ink}
            accessibilityLabel="Selected"
          />
        </Surface>
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
