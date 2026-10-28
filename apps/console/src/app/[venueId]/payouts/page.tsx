import { Wallet } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";

export default function Page() {
  return (
    <ConsolePage>
      <PageHeader
        title="Payouts"
        description="In-app payments settle through Tap. Desk and phone bookings are not in these numbers."
      />
      <EmptyState
        icon={Wallet}
        title="No payouts yet"
        description="Payouts arrive once provider settlement reporting is wired; in-app payments settle through Tap."
      />
    </ConsolePage>
  );
}
