import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";

import { AmericanoPreviewStates } from "./preview-states";

export default function AmericanoDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return (
    <DashboardShell title="Americano preview" width="wide">
      <AmericanoPreviewStates />
    </DashboardShell>
  );
}
