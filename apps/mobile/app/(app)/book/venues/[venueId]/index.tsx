import { useLocalSearchParams } from "expo-router";

import { VenueScreen } from "../../../../../src/booking/venue-screen";

export default function Venue() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  return <VenueScreen venueId={venueId} />;
}
