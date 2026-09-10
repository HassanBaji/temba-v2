import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";

export default function PickAPartnerLoading() {
  return (
    <DashboardShell
      title="Pick a partner"
      hidePageHeader
      hideMobileTopBar
      hideNav
    >
      <DetailPageSkeleton />
    </DashboardShell>
  );
}
