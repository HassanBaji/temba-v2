import { useLocalSearchParams } from "expo-router";

import { BookingDetailScreen } from "../../../../../src/booking/booking-detail-screen";

export default function BookingDetails() {
  const { bookingId, returned } = useLocalSearchParams<{
    bookingId: string;
    returned?: string;
  }>();
  return (
    <BookingDetailScreen bookingId={bookingId} returned={returned === "1"} />
  );
}
