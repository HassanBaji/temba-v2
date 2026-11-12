"use client";

import { use } from "react";

import { RatingsPage } from "~/components/you/ratings-page";
import { isSport } from "@repo/domain/sport";

export default function YouRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport } = use(searchParams);
  return <RatingsPage initialSport={isSport(sport) ? sport : "padel"} />;
}
