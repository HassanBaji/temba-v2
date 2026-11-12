"use client";

import { rateGameEntry } from "@repo/domain/performance-rating";
import Link from "next/link";

import { useLocale } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { gameRateHref } from "~/lib/dashboard-paths";
import { type RouterOutputs } from "~/trpc/react";

type RatingWindow = RouterOutputs["games"]["byId"]["ratingWindow"];

/** Opens Rate the game (screen 4a) while the Organizer may still rate. */
export function RateGameCard({
  gameId,
  window,
}: {
  gameId: string;
  window: RatingWindow;
}) {
  const locale = useLocale();
  const entry = rateGameEntry(window, locale);
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
      <Button asChild>
        <Link href={gameRateHref(gameId)}>{entry.cta}</Link>
      </Button>
    </section>
  );
}
