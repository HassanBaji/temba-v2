import { useLocalSearchParams } from "expo-router";

import { VenueDetailsScreen } from "../../../../../src/booking/venue-details-screen";

export default function VenueDetails() {
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  return <VenueDetailsScreen venueId={venueId} />;
}
