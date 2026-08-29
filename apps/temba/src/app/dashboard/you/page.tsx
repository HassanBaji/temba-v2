import { UserButton } from "@clerk/nextjs";

import { DashboardShell } from "~/components/dashboard-shell";

export default function YouPage() {
  return (
    <DashboardShell
      title="You"
      description="Teams, Invites, and Operator tools will live here."
    >
      <div className="space-y-4">
        <UserButton showName />
        <p className="text-body text-muted-foreground">
          Your profile hub is coming next.
        </p>
      </div>
    </DashboardShell>
  );
}
