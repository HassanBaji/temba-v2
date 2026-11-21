"use client";

import Link from "next/link";

import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SeriesBadge } from "./series-badge";
import {
  seriesEditionCard,
  type SeriesEditionGame,
} from "./series-edition-card-model";

const cardClass =
  "border-rule bg-paper text-ink rounded-card flex items-center gap-[13px] border px-4 py-[13px]";

/**
 * The paper Series card under a Game's hero: what winning its Edition takes
 * until it is decided, then who won it on a Played game. A won Social leads
 * with `SeriesWinnersCard` instead, so this renders nothing there.
 */
export function SeriesGameCard({
  gameId,
  game,
  className,
}: {
  gameId: string;
  game: SeriesEditionGame;
  className?: string;
}) {
  const locale = useLocale();
  const m = useMessages();
  const edition = api.series.edition.useQuery({ gameId });
  const card = seriesEditionCard(edition.data, game, locale);
  if (!card || card.kind === "winners") {
    return null;
  }
  if (card.kind === "partOf") {
    return (
      <PaperSeriesCard
        badge={card.model}
        href={card.model.href}
        action={m.series.game.seeSeries}
        className={className}
      >
        <span className="text-body block break-words font-semibold">
          {card.model.title}
        </span>
        <span className="text-eyebrow text-muted-foreground block leading-[1.45]">
          {card.model.rule}
        </span>
      </PaperSeriesCard>
    );
  }
  return (
    <PaperSeriesCard
      badge={card.model}
      href={card.model.href}
      action={m.series.game.seeTheSeries}
      className={className}
    >
      <span className="text-body block break-words font-semibold">
        {card.model.title}
      </span>
      <span
        dir="auto"
        className="text-eyebrow text-muted-foreground block leading-[1.45]"
      >
        {card.model.line}
      </span>
      {card.model.ordinal ? (
        <span className="text-eyebrow block font-semibold leading-[1.45]">
          {card.model.ordinal}
        </span>
      ) : null}
    </PaperSeriesCard>
  );
}

function PaperSeriesCard({
  badge,
  href,
  action,
  className,
  children,
}: {
  badge: { emblem: SeriesEmblem; colour: SeriesColour };
  href: string | null;
  action: string;
  className?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <SeriesBadge emblem={badge.emblem} colour={badge.colour} size="list" />
      <span className="min-w-0 flex-1">{children}</span>
      {href ? (
        <span className="text-meta shrink-0 font-semibold">{action}</span>
      ) : null}
    </>
  );

  return href ? (
    <Link
      href={href}
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
