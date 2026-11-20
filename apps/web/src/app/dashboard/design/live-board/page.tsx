import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";

import { LiveBoardPreviewStates } from "./preview-states";

export default function LiveBoardDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return (
    <DashboardShell title="Live board preview" width="wide">
      <LiveBoardPreviewStates />
    </DashboardShell>
  );
}
