"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { SeriesPage } from "~/components/series/series-page";

export default function SeriesRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();

  return (
    <DashboardShell
      title={m.series.page.title}
      width="content"
      hidePageHeader
      hideMobileTopBar
    >
      <SeriesPage id={id} />
    </DashboardShell>
  );
}
