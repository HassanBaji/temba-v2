import { DashboardShell } from "~/components/dashboard-shell";

/** Stub hub for TEM-5 primary nav; full hub lands in a later ticket. */
export default function GroupsAndCommunitiesHubPage() {
  return (
    <DashboardShell title="Groups & Communities">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Groups &amp; Communities
        </h2>
        <p className="text-muted-foreground text-sm">
          Your Groups and Communities will appear here.
        </p>
      </div>
    </DashboardShell>
  );
}
