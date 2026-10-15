import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";

export default function ManageCustomersPage() {
  return (
    <EmptyState
      icon={Users}
      title="No Customers yet"
      description="People who book this Venue will appear here."
    />
  );
}
