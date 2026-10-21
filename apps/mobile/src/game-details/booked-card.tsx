import { bookedCourtLine } from "@repo/domain/booking-copy";
import type { FriendlyGameDetailsBooking } from "@repo/domain/friendly-game-details";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { bookingPath } from "../booking/booking-model";
import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function BookedCard({
  booking,
}: {
  booking: FriendlyGameDetailsBooking;
}) {
  const router = useRouter();
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
            Booked
          </Text>
          <Text weight="semibold">{bookedCourtLine(booking)}</Text>
        </View>
        <Text size="meta" tone="muted">
          {UNRATED_LABEL}
        </Text>
      </View>
      {booking.heldByViewer ? (
        <Button
          label="View booking"
          variant="outline"
          size="sm"
          onPress={() => router.push(bookingPath(booking.id))}
        />
      ) : null}
    </Surface>
  );
}
