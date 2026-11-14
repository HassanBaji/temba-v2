"use client";

import { CrownIcon } from "lucide-react";

import { formatGameDay } from "@repo/domain/format-game-start";
import { ratingScopeTag } from "@repo/domain/game-rating-impact";
import { type KingPlayedSummary } from "@repo/domain/tournament-king-view";

import { SummaryCardShell } from "~/components/games/summary-card-shell";
import { useLocale, useMessages } from "~/components/locale-provider";

import { PlaceChip } from "./tournament-finished-parts";
import { InitialsMark } from "./tournament-round-parts";

type KingPlayedGame = {
  id: string;
  name: string | null;
  windowStart: Date | null;
  displayTime: Date;
  groupName: string | null;
  venue: { name: string };
  kingOfTheCourt: KingPlayedSummary;
};

/** 3c: where the viewer finished and who was king. No Match results: none are recorded. */
export function KingPlayedCard({ game }: { game: KingPlayedGame }) {
  const messages = useMessages();
  const m = messages.tournamentKing;
  const locale = useLocale();
  const king = game.kingOfTheCourt;
  const headline = !king.posted
    ? m.card.toCome
    : king.place != null
      ? m.card.finishedPlace(king.place, king.teamCount)
      : m.card.notPlaced(king.teamCount);
  const day = formatGameDay(game.windowStart ?? game.displayTime, locale, {
    weekday: "short",
  });
  const title = game.name ?? m.shape.title;
  const scopeTag = ratingScopeTag(
    { rated: false, ratingScope: "unrated" },
    locale,
  );
  const summary = m.finished.summary(
    game.venue.name,
    king.teamCount,
    king.courtCount,
  );

  return (
    <li data-slot="king-played-card">
      <SummaryCardShell
        href={`/dashboard/games/${game.id}`}
        linkLabel={[headline, title, summary].join(", ")}
      >
        <div className="border-rule pointer-events-none relative z-10 flex items-center justify-between gap-3 border-b px-4 py-3">
          <span className="flex min-w-0 items-center gap-2.5 font-semibold">
            {king.place != null ? <PlaceChip place={king.place} /> : null}
            <span className="truncate">{headline}</span>
          </span>
          <span className="text-muted-foreground text-meta shrink-0">
            {day}
          </span>
        </div>
        <div className="pointer-events-none relative z-10 flex flex-col gap-3 px-4 py-3.5">
          <p className="text-muted-foreground text-eyebrow flex items-center gap-2 uppercase tracking-[0.06em]">
            {scopeTag ? <span>{scopeTag}</span> : null}
            {game.groupName ? (
              <span dir="auto" className="truncate normal-case tracking-normal">
                {game.groupName}
              </span>
            ) : null}
          </p>
          <div>
            <p className="font-expanded text-title leading-tight tracking-[-0.03em]">
              {title}
            </p>
            <p className="text-muted-foreground text-meta mt-0.5">{summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <InitialsMark name={king.viewerTeam.markName} isViewer />
            <div className="min-w-0">
              <p dir="auto" className="text-meta truncate font-semibold">
                {king.viewerTeam.name}
              </p>
              {king.startCourt ? (
                <p className="text-muted-foreground text-meta">
                  {m.card.startedOn(king.startCourt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {king.king ? (
          <div className="border-rule pointer-events-none relative z-10 flex items-center gap-3 border-t px-4 py-3">
            <InitialsMark
              name={king.king.markName}
              isViewer={king.king.isViewer}
              className="size-7 text-[11px]"
            />
            <span className="text-meta min-w-0 flex-1 truncate">
              <CrownIcon
                aria-hidden="true"
                className="me-1.5 inline size-3.5 align-[-2px]"
              />
              {m.card.kingOfTheCourt}{" "}
              <span dir="auto" className="font-semibold">
                {king.king.name}
              </span>
            </span>
            <span className="text-muted-foreground text-meta shrink-0">
              {m.card.finalOrder}
            </span>
          </div>
        ) : null}
      </SummaryCardShell>
    </li>
  );
}
