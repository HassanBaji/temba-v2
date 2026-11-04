import { bookedCourtLine } from "@repo/domain/booking-copy";
import type { FriendlyGameDetailsBooking } from "@repo/domain/friendly-game-details";
import {
  gameRatingScopeLabel,
  type GameRatingScope,
} from "@repo/domain/game-rating-scope";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { bookingPath } from "../booking/booking-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function BookedCard({
  booking,
  ratingScope,
}: {
  booking: FriendlyGameDetailsBooking;
  ratingScope: GameRatingScope;
}) {
  const router = useRouter();
  const m = useMessages();
  const locale = useLocale();
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
            {m.mobileGameDetails.booked.eyebrow}
          </Text>
          <Text weight="semibold">{bookedCourtLine(booking, locale)}</Text>
        </View>
        <Text size="meta" tone="muted">
          {gameRatingScopeLabel(ratingScope, locale)}
        </Text>
      </View>
      {booking.heldByViewer ? (
        <Button
          label={m.mobileGameDetails.booked.view}
          variant="outline"
          size="sm"
          onPress={() => router.push(bookingPath(booking.id))}
        />
      ) : null}
    </Surface>
  );
}
