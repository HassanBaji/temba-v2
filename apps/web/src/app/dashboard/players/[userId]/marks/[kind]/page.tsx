"use client";

import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { MarkDetailPage } from "~/components/marks/mark-detail-page";
import { isCoinKind, markName } from "@repo/domain/marks";

export default function PlayerMarkPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; kind: string }>;
  searchParams: Promise<{ sport?: string | string[] }>;
}) {
  const { userId, kind } = use(params);
  const { sport } = use(searchParams);
  const locale = useLocale();
  const m = useMessages();
  const coinKind = isCoinKind(kind) ? kind : null;

  return (
    <DashboardShell
      title={coinKind ? markName(coinKind, locale) : m.marks.cabinet.title}
      width="content"
      hidePageHeader
    >
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[640px] pb-10 lg:mt-2">
        <MarkDetailPage
          userId={userId}
          kind={coinKind}
          requestedSport={sport}
        />
      </div>
    </DashboardShell>
  );
}
