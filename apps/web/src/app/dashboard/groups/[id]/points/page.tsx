"use client";

import { use } from "react";

import { TierHistoryPage } from "~/components/groups/tier-history-page";

export default function GroupPointsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ member?: string }>;
}) {
  const { id } = use(params);
  const { member } = use(searchParams);
  return <TierHistoryPage groupId={id} userId={member} />;
}
