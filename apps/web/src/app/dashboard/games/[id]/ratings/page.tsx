"use client";

import { use } from "react";

import { RatingSummaryPage } from "~/components/games/rating-summary-page";

export default function GameRatingSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RatingSummaryPage gameId={id} />;
}
