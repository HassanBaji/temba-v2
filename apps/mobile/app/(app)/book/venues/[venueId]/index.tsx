import { useLocalSearchParams } from "expo-router";

import { sportFromParam } from "../../../../../src/booking/book-sport";
import { VenueScreen } from "../../../../../src/booking/venue-screen";

export default function Venue() {
  const { venueId, sport } = useLocalSearchParams<{
    venueId: string;
    sport?: string;
  }>();
  return <VenueScreen venueId={venueId} sport={sportFromParam(sport)} />;
}
