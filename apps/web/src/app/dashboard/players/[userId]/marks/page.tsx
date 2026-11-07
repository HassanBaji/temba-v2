"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { CabinetPage } from "~/components/marks/cabinet-page";

export default function PlayerMarksPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const { userId } = use(params);
  const { sport } = use(searchParams);
  const m = useMessages();

  return (
    <DashboardShell
      title={m.marks.cabinet.title}
      width="content"
      hidePageHeader
    >
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[640px] pb-10 lg:mt-2">
        <CabinetPage userId={userId} requestedSport={sport} />
      </div>
    </DashboardShell>
  );
}
