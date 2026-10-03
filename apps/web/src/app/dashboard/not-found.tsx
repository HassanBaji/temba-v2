import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";

export default function DashboardNotFound() {
  return (
    <DashboardShell title="Not found">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="This page does not exist or is no longer available."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to Home</Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}
