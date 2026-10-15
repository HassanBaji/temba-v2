import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";

export default function ManageOverviewPage() {
  return (
    <EmptyState
      icon={LayoutDashboard}
      title="Nothing to show yet"
      description="Today's Bookings, occupancy and outstanding payments will appear here."
    />
  );
}
