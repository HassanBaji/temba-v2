import { useLocalSearchParams } from "expo-router";

import { sportFromParam } from "../../../../../src/booking/book-sport";
import { CheckoutScreen } from "../../../../../src/booking/checkout-screen";

export default function Checkout() {
  const { venueId, startsAt, minutes, courtId, sport } = useLocalSearchParams<{
    venueId: string;
    startsAt: string;
    minutes: string;
    courtId: string;
    sport?: string;
  }>();
  return (
    <CheckoutScreen
      venueId={venueId}
      startsAtIso={startsAt ?? ""}
      durationMinutes={Number(minutes)}
      courtId={courtId ?? ""}
      sport={sportFromParam(sport)}
    />
  );
}
