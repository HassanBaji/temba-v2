import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";

export default function Page() {
  return (
    <ConsolePage>
      <PageHeader
        title="Customers"
        description="Everyone who has booked here. Temba players link to their profile; walk-ins are yours only."
      />
      <EmptyState
        icon={Users}
        title="No Customers list yet"
        description="Customers arrive with the Customers list ticket (TEM-368)."
      />
    </ConsolePage>
  );
}
