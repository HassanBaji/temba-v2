import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { View } from "react-native";

import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { DetailRow, Notice } from "./booking-parts";
import { venuePath } from "./booking-model";
import { hoursLabel } from "./venues-model";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function VenueDetailsScreen({ venueId }: { venueId: string }) {
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
                ? "This venue is not taking bookings"
                : "The venue could not be loaded"
            }
            description={venue.error.message}
            actionLabel="Try again"
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
        <DetailRow label="Opening hours" first>
          {data.openingHours.map((entry) => (
            <Text
              key={entry.weekday}
              size="meta"
              style={{ textAlign: "right" }}
            >
              {`${WEEKDAYS[entry.weekday]}  ${hoursLabel(entry.windows)}`}
            </Text>
          ))}
        </DetailRow>
        {data.phone ? (
          <DetailRow label="Venue">
            <Text size="meta">{data.phone}</Text>
          </DetailRow>
        ) : null}
      </View>
    </Screen>
  );
}
