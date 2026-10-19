import { useLocalSearchParams } from "expo-router";

import { PaymentScreen } from "../../../../../src/booking/payment-screen";

export default function Payment() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <PaymentScreen bookingId={bookingId} />;
}
