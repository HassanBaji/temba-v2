"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { NewSeriesPage } from "~/components/series/new-series-page";

export default function NewSeriesRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();

  return (
    <DashboardShell
      title={m.series.create.title}
      width="content"
      hidePageHeader
      hideMobileTopBar
      hideNav
    >
      <NewSeriesPage groupId={id} />
    </DashboardShell>
  );
}
