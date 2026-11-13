"use client";

import { ratingSummaryEntry } from "@repo/domain/performance-rating";
import Link from "next/link";

import { useLocale } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { gameRatingSummaryHref } from "~/lib/dashboard-paths";
import { type RouterOutputs } from "~/trpc/react";

type RatingWindow = RouterOutputs["games"]["byId"]["ratingWindow"];

/** Opens the ratings summary for an Organizer once the window has settled. */
export function RatingSummaryCard({
  gameId,
  window,
  isOrganizer,
}: {
  gameId: string;
  window: RatingWindow;
  isOrganizer: boolean;
}) {
  const locale = useLocale();
  const entry = ratingSummaryEntry(window, isOrganizer, locale);
  if (!entry) {
    return null;
  }
  return (
    <section className="border-rule flex items-center gap-3.5 rounded-[16px] border px-[18px] py-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{entry.title}</p>
        <p className="text-meta text-muted-foreground mt-0.5">
          {entry.description}
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={gameRatingSummaryHref(gameId)}>{entry.cta}</Link>
      </Button>
    </section>
  );
}
