"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { GroupSeriesPage } from "~/components/series/group-series-page";

export default function GroupSeriesRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();

  return (
    <DashboardShell
      title={m.series.tab.title}
      width="content"
      hidePageHeader
      hideMobileTopBar
      hideNav
    >
      <GroupSeriesPage groupId={id} />
    </DashboardShell>
  );
}
