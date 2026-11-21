"use client";

import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SeriesBadge } from "./series-badge";
import { seriesGameCardModel } from "./series-game-card-model";

const cardClass =
  "border-rule bg-paper text-ink rounded-card flex items-center gap-[13px] border px-4 py-[13px]";

/** What winning this Game's Edition means, with a way to its Series page. */
export function SeriesGameCard({
  gameId,
  className,
}: {
  gameId: string;
  className?: string;
}) {
  const locale = useLocale();
  const m = useMessages();
  const edition = api.series.edition.useQuery({ gameId });
  const model = seriesGameCardModel(edition.data, locale);
  if (!model) {
    return null;
  }

  const body = (
    <>
      <SeriesBadge emblem={model.emblem} colour={model.colour} size="list" />
      <span className="min-w-0 flex-1">
        <span className="text-body block break-words font-semibold">
          {model.title}
        </span>
        <span className="text-eyebrow text-muted-foreground block leading-[1.45]">
          {model.rule}
        </span>
      </span>
      {model.href ? (
        <span className="text-meta shrink-0 font-semibold">
          {m.series.game.seeSeries}
        </span>
      ) : null}
    </>
  );

  return model.href ? (
    <Link
      href={model.href}
      data-slot="series-game-card"
      className={cn(
        cardClass,
        className,
        "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
      )}
    >
      {body}
    </Link>
  ) : (
    <div data-slot="series-game-card" className={cn(cardClass, className)}>
      {body}
    </div>
  );
}
