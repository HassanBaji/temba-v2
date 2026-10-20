import { useLocalSearchParams } from "expo-router";

import { CheckoutScreen } from "../../../../../src/booking/checkout-screen";

export default function Checkout() {
  const { venueId, startsAt, minutes } = useLocalSearchParams<{
    venueId: string;
    startsAt: string;
    minutes: string;
  }>();
  return (
    <CheckoutScreen
      venueId={venueId}
      startsAtIso={startsAt ?? ""}
      durationMinutes={Number(minutes)}
    />
  );
}
