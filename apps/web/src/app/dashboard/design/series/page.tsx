import { notFound } from "next/navigation";

import { DashboardShell } from "~/components/dashboard-shell";
import { getRequestMessages } from "~/lib/request-locale";

import { SeriesBadgeSet } from "./series-badge-set";

export default async function SeriesDesignPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  const m = await getRequestMessages();

  return (
    <DashboardShell title={m.series.gallery.title} width="wide">
      <SeriesBadgeSet />
    </DashboardShell>
  );
}
