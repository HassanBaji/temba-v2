import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";

import { FootballPreviewStates } from "./preview-states";

export default function FootballDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <DashboardShell title="Football preview" width="wide">
      <FootballPreviewStates />
    </DashboardShell>
  );
}
