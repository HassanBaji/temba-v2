import { useLocalSearchParams } from "expo-router";

import { CheckoutScreen } from "../../../../../src/booking/checkout-screen";

export default function Checkout() {
  const { venueId, startsAt, minutes, courtId } = useLocalSearchParams<{
    venueId: string;
    startsAt: string;
    minutes: string;
    courtId: string;
  }>();
  return (
    <CheckoutScreen
      venueId={venueId}
      startsAtIso={startsAt ?? ""}
      durationMinutes={Number(minutes)}
      courtId={courtId ?? ""}
    />
  );
}
