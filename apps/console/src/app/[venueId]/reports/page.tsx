import { BarChart3 } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";

export default function Page() {
  return (
    <ConsolePage>
      <PageHeader
        title="Reports"
        description="Occupancy and revenue, with the Temba effect broken out: how many hours came from open and group games."
      />
      <EmptyState
        icon={BarChart3}
        title="No reports yet"
        description="Reports arrive with the Venue reports ticket (TEM-369)."
      />
    </ConsolePage>
  );
}
