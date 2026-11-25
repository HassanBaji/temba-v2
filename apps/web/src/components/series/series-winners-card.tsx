"use client";

import { ShareIcon } from "lucide-react";
import Link from "next/link";

import { formatGameDay } from "@repo/domain/format-game-start";

import { shareResultHref } from "~/components/games/played/played-game-view";
import { useLocale, useMessages } from "~/components/locale-provider";
import { buttonVariants } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SeriesBadge } from "./series-badge";
import { seriesEditionCard } from "./series-edition-card-model";

/** 3a: a won Social's one lifted card, with who won and what number it is for them. */
export function SeriesWinnersCard({
  gameId,
  windowStart,
  className,
}: {
  gameId: string;
  windowStart: Date | string | null;
  className?: string;
}) {
  const locale = useLocale();
  const m = useMessages();
  const edition = api.series.edition.useQuery({ gameId });
  const card = seriesEditionCard(edition.data, "social", locale);
  if (card?.kind !== "winners") {
    return null;
  }
  const { model } = card;

  return (
    <Surface
      as="section"
      tone="ink"
      radius="card"
      data-slot="series-winners-card"
      aria-label={model.title}
      className={cn("flex flex-col gap-3.5 px-5 pb-5 pt-[22px]", className)}
    >
      <div className="text-dim text-meta flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate">{model.title}</p>
        {windowStart ? (
          <p className="shrink-0">
            {formatGameDay(windowStart, locale, {
              weekday: "short",
              month: "short",
            })}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <SeriesBadge
          emblem={model.emblem}
          colour={model.colour}
          size="sheet"
          surface="focus"
        />
        <div className="min-w-0">
          <p className="text-dim text-meta">{m.series.game.winners}</p>
          <ul className="mt-1">
            {model.names.map((name, index) => (
              <li
                key={index}
                dir="auto"
                className="font-expanded break-words text-[26px] leading-[1.05] tracking-[-0.03em]"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {model.blocks.length > 0 ? (
        <ul className="border-dimrule grid grid-cols-2 gap-3 border-t pt-3">
          {model.blocks.map((block) => (
            <li key={block.key} className="min-w-0">
              <p className="text-meta font-semibold">{block.ordinal}</p>
              {block.tally ? (
                <p className="text-dim text-eyebrow leading-snug">
                  {block.tally}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div
        className={cn("grid gap-2", model.href ? "grid-cols-2" : "grid-cols-1")}
      >
        <Link
          href={shareResultHref(gameId)}
          className={cn(
            buttonVariants({ variant: "inverse" }),
            "rounded-lg font-semibold",
          )}
        >
          <ShareIcon aria-hidden="true" />
          {m.common.share}
        </Link>
        {model.href ? (
          <Link
            href={model.href}
            className={cn(
              buttonVariants({ variant: "outline-inverse" }),
              "rounded-lg font-semibold",
            )}
          >
            {m.series.game.seeTheSeries}
          </Link>
        ) : null}
      </div>
    </Surface>
  );
}
