import { useLocalSearchParams } from "expo-router";

import { BookedScreen } from "../../../../../src/booking/booked-screen";

export default function Booked() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <BookedScreen bookingId={bookingId} />;
}
