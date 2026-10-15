import { CalendarDays } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";

export default function ManageBookingsPage() {
  return (
    <EmptyState
      icon={CalendarDays}
      title="No Bookings yet"
      description="Bookings for this Venue will appear here."
    />
  );
}
