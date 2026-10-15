import { ChartColumn } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";

export default function ManageReportsPage() {
  return (
    <EmptyState
      icon={ChartColumn}
      title="No reports yet"
      description="Occupancy, revenue and Customer reports will appear here."
    />
  );
}
