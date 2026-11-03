import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { getRequestMessages } from "~/lib/request-locale";

export default async function DashboardNotFound() {
  const m = await getRequestMessages();
  return (
    <DashboardShell title={m.webDashboard.notFound.title}>
      <EmptyState
        icon={SearchX}
        title={m.common.pageNotFound}
        description={m.webDashboard.notFound.description}
        action={
          <Button asChild>
            <Link href="/dashboard">{m.webDashboard.backToHome}</Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}
