import { useLocalSearchParams } from "expo-router";

import { BookingGameScreen } from "../../../../../src/create-game/booking-game-screen";

export default function BookingGame() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return <BookingGameScreen bookingId={bookingId} />;
}
