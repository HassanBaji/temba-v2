import { Wallet } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ConsolePage } from "~/components/console/console-page";
import { PageHeader } from "~/components/console/page-header";
import { getRequestMessages } from "~/lib/request-locale";

export default async function Page() {
  const m = (await getRequestMessages()).consoleShell.payouts;
  return (
    <ConsolePage>
      <PageHeader title={m.title} description={m.description} />
      <EmptyState
        icon={Wallet}
        title={m.emptyTitle}
        description={m.emptyDescription}
      />
    </ConsolePage>
  );
}
