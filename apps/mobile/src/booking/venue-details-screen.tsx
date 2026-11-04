import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { DetailRow, Notice } from "./booking-parts";
import { venuePath } from "./booking-model";
import { hoursLabel } from "./venues-model";

export function VenueDetailsScreen({ venueId }: { venueId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const venue = api.bookings.venueForBooking.useQuery(
    { venueId },
    { enabled: Boolean(venueId) },
  );

  if (!venue.data) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={venuePath(venueId)} />
        {venue.error ? (
          <Notice
            title={
              isNotFoundError(venue.error)
                ? m.mobileBooking.venueScreen.notTakingBookings
                : m.mobileBooking.venueScreen.loadError
            }
            description={venue.error.message}
            actionLabel={m.common.tryAgain}
            onAction={() => void venue.refetch()}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={40} />
            <Skeleton height={180} />
          </View>
        )}
      </Screen>
    );
  }

  const data = venue.data;

  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback={venuePath(venueId)}
        title={data.name}
      />
      <View>
        <DetailRow label={m.mobileBooking.openingHours} first>
          {data.openingHours.map((entry) => (
            <Text
              key={entry.weekday}
              size="meta"
              style={{ textAlign: "right" }}
            >
              {`${m.mobileBooking.weekdayShort(entry.weekday)}  ${hoursLabel(entry.windows, locale)}`}
            </Text>
          ))}
        </DetailRow>
        {data.phone ? (
          <DetailRow label={m.mobileBooking.venue}>
            <Text size="meta" ltr>
              {data.phone}
            </Text>
          </DetailRow>
        ) : null}
      </View>
    </Screen>
  );
}
