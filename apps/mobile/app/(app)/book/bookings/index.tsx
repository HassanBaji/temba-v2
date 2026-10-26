import { useLocalSearchParams } from "expo-router";

import { MyBookingsScreen } from "../../../../src/booking/my-bookings-screen";

export default function BookBookings() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <MyBookingsScreen initialTab={tab === "past" ? "past" : "upcoming"} />;
}
