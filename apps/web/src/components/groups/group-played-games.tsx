"use client";

import {
  groupPlayedFilterChips,
  groupPlayedListItems,
  groupPlayedRecordLine,
  type GroupPlayedCard,
  type GroupPlayedSide,
} from "@repo/domain/group-played-card";
import type {
  GroupPlayedCounts,
  GroupPlayedFilter,
} from "@repo/domain/group-played-filter";
import {
  seasonBoundaryLabel,
  seasonForDate,
  type GroupSeasonData,
} from "@repo/domain/group-season";
import Link from "next/link";
import * as React from "react";

import { BibChip } from "~/components/games/football-bibs";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type PlayedGame = RouterOutputs["groups"]["byId"]["gameHistory"][number];

const HEADING = "font-expanded text-title leading-tight";

function gameHref(gameId: string) {
  return `/dashboard/games/${gameId}`;
}

function SideRow({
  side,
  isFootball,
}: {
  side: GroupPlayedSide;
  isFootball: boolean;
}) {
  const m = useMessages();
  return (
    <div className="flex items-center gap-2">
      {side.bib ? <BibChip bib={side.bib} className="size-2.5" /> : null}
      <span
        className={cn(
          "text-body min-w-0 flex-1 truncate",
          !side.strong && "text-muted-foreground",
        )}
      >
        {side.name}
        {isFootball && side.isViewerSide ? (
          <span className="text-dim ms-2">{m.group.played.you}</span>
        ) : null}
      </span>
      <span dir="ltr" className="flex shrink-0 gap-1">
        {side.cells.map((cell, index) => (
          <span
            key={index}
            className={cn(
              "font-expanded min-w-5 text-center text-[18px] tabular-nums leading-none tracking-[-0.02em]",
              cell.strong
                ? "text-ink"
                : isFootball
                  ? "text-muted-foreground"
                  : "text-dim",
            )}
          >
            {cell.value}
          </span>
        ))}
      </span>
    </div>
  );
}

function PlayedCard({ card }: { card: GroupPlayedCard }) {
  const m = useMessages();
  const cancelled = card.status === "cancelled";
  const scoreHref = card.isFootball
    ? `${gameHref(card.id)}/score`
    : gameHref(card.id);
  return (
    <li className="border-rule hover:border-ink focus-within:border-ink relative flex flex-col gap-3 rounded-[14px] border px-4 py-3.5 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <Link
            href={gameHref(card.id)}
            aria-label={card.accessibilityLabel}
            className={cn(
              "text-body truncate font-semibold outline-none after:absolute after:inset-0 after:rounded-[14px]",
              cancelled && "text-muted-foreground",
            )}
          >
            {card.title}
          </Link>
          <span className="text-meta text-muted-foreground truncate">
            {card.whenLine}
          </span>
        </div>
        {card.result ? (
          <span className="text-eyebrow text-muted-foreground flex shrink-0 items-center gap-1.5 pt-0.5">
            <ResultMark
              variant={card.result.mark}
              decorative
              className="size-3.5"
            />
            {card.result.label}
          </span>
        ) : null}
        {cancelled ? (
          <span className="border-dim text-muted-foreground mt-0.5 shrink-0 rounded-[4px] border border-dashed px-[5px] py-0.5 font-mono text-[10px] uppercase">
            {m.group.played.cancelled}
          </span>
        ) : null}
      </div>
      {card.sides ? (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex min-w-0 flex-1 flex-col gap-1.5"
          >
            {card.sides.map((side) => (
              <SideRow
                key={side.key}
                side={side}
                isFootball={card.isFootball}
              />
            ))}
          </div>
          {card.status === "needs_score" ? (
            <Button
              asChild
              className="relative z-10 h-11 shrink-0 font-semibold"
            >
              <Link href={scoreHref}>{m.group.played.enterScore}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {card.cancelledLine ? (
        <span aria-hidden="true" className="text-meta text-muted-foreground">
          {card.cancelledLine}
        </span>
      ) : null}
    </li>
  );
}

/** The Season a Game opens when it starts a new one after the previous Game. */
function seasonBoundaries(games: PlayedGame[], seasons: GroupSeasonData[]) {
  const boundaries = new Map<string, GroupSeasonData>();
  let previousSeasonId: string | null = null;
  games.forEach((game, index) => {
    const season = seasonForDate(seasons, game.displayTime);
    if (index > 0 && season && season.id !== previousSeasonId) {
      boundaries.set(game.id, season);
    }
    previousSeasonId = season?.id ?? null;
  });
  return boundaries;
}

export function GroupPlayedGames({
  games,
  counts,
  filter,
  onFilterChange,
  filtering,
  sport,
  seasons,
  canLoadMore,
  loadingMore,
  loadMoreFailed,
  onLoadMore,
}: {
  games: PlayedGame[];
  counts: GroupPlayedCounts;
  filter: GroupPlayedFilter;
  onFilterChange: (filter: GroupPlayedFilter) => void;
  /** The list still shows the previous filter while the new one loads. */
  filtering: boolean;
  sport: string | null;
  seasons: GroupSeasonData[];
  canLoadMore: boolean;
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onLoadMore: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.group.played;
  const record = groupPlayedRecordLine(counts, sport, locale);
  const chips = groupPlayedFilterChips(counts, filter, locale);
  const items = groupPlayedListItems(games, locale);
  const boundaries = seasonBoundaries(games, seasons);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={HEADING}>{m.webGroup.games.played}</h2>
        {record ? (
          <span
            aria-label={record.accessibilityLabel}
            className="text-muted-foreground font-mono text-[11px]"
          >
            {record.text}
          </span>
        ) : null}
      </div>
      <div
        role="tablist"
        aria-label={copy.filtersLabel}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
      >
        {chips.map((chip) => (
          <button
            key={chip.filter}
            type="button"
            role="tab"
            aria-selected={chip.selected}
            aria-label={chip.accessibilityLabel}
            onClick={() => onFilterChange(chip.filter)}
            className={cn(
              "text-body focus-visible:ring-ring/50 flex h-10 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[10px] border px-3 outline-none transition-colors focus-visible:ring-[3px]",
              chip.selected
                ? "border-ink bg-control text-on-control font-semibold"
                : "border-rule bg-paper text-ink hover:border-ink",
            )}
          >
            {chip.dot ? (
              <span
                aria-hidden="true"
                className="bg-ink size-1.5 rounded-full"
              />
            ) : null}
            <span>{chip.label}</span>
            <span
              className={cn(
                "font-mono text-[11px]",
                chip.selected
                  ? "text-on-control-muted"
                  : "text-muted-foreground",
              )}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>
      <ul
        aria-busy={filtering}
        className={cn(
          "flex flex-col gap-2 transition-opacity",
          filtering && "opacity-50",
        )}
      >
        {items.map((item) => {
          if (item.kind === "month") {
            return (
              <li
                key={item.key}
                className="text-muted-foreground flex justify-between px-0.5 pb-0.5 pt-2.5 font-mono text-[11px] uppercase"
              >
                <span>{item.label}</span>
                <span>{item.count}</span>
              </li>
            );
          }
          const boundary = boundaries.get(item.card.id) ?? null;
          return (
            <React.Fragment key={item.key}>
              {boundary ? (
                <li
                  aria-label={boundary.name}
                  className="text-eyebrow text-muted-foreground flex items-center gap-3 py-1 tracking-[0.06em]"
                >
                  <span aria-hidden="true" className="bg-rule h-px flex-1" />
                  <span className="shrink-0 font-mono">
                    {seasonBoundaryLabel(boundary, locale)}
                  </span>
                  <span aria-hidden="true" className="bg-rule h-px flex-1" />
                </li>
              ) : null}
              <PlayedCard card={item.card} />
            </React.Fragment>
          );
        })}
        {items.length === 0 ? (
          <li className="border-rule flex flex-col items-start gap-3.5 rounded-[14px] border px-[18px] py-[22px]">
            <p className="text-body text-muted-foreground">
              {copy.filterEmpty[filter]}
            </p>
            {filter !== "all" ? (
              <Button variant="outline" onClick={() => onFilterChange("all")}>
                {copy.showAll}
              </Button>
            ) : null}
          </li>
        ) : null}
      </ul>
      {canLoadMore || loadMoreFailed ? (
        <div className="flex flex-col items-center gap-2">
          {loadMoreFailed ? (
            <p role="alert" className="text-body text-muted-foreground">
              {m.webGroup.games.loadMoreFailed}
            </p>
          ) : null}
          {canLoadMore ? (
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? m.common.loading : m.webGroup.games.loadMore}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
