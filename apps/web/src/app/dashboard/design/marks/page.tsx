import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";

import { MarksSet } from "./marks-set";

export default function MarksDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <DashboardShell title="Marks preview" width="wide">
      <MarksSet />
    </DashboardShell>
  );
}
