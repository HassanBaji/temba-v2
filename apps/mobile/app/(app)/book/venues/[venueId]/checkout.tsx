import { useLocalSearchParams } from "expo-router";

import { CheckoutScreen } from "../../../../../src/booking/checkout-screen";

export default function Checkout() {
  const { venueId, startsAt } = useLocalSearchParams<{
    venueId: string;
    startsAt: string;
  }>();
  return <CheckoutScreen venueId={venueId} startsAtIso={startsAt ?? ""} />;
}
