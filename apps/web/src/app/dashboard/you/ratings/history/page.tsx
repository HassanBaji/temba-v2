"use client";

import { use } from "react";

import { RatingHistoryPage } from "~/components/you/rating-history-page";
import { isSport } from "@repo/domain/sport";

export default function YouRatingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = use(searchParams);
  return <RatingHistoryPage sport={isSport(sport) ? sport : "padel"} />;
}
