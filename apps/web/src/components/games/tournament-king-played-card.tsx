"use client";

import { CrownIcon } from "lucide-react";

import { ratingScopeTag } from "@repo/domain/game-rating-impact";
import {
  kingPlayedCardModel,
  type KingPlayedSummary,
} from "@repo/domain/tournament-king-view";

import { SummaryCardShell } from "~/components/games/summary-card-shell";
import { useLocale } from "~/components/locale-provider";

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
  const locale = useLocale();
  const view = kingPlayedCardModel(game, locale);
  const scopeTag = ratingScopeTag(
    { rated: false, ratingScope: "unrated" },
    locale,
  );

  return (
    <li data-slot="king-played-card">
      <SummaryCardShell
        href={`/dashboard/games/${game.id}`}
        linkLabel={[view.headline, view.title, view.summary].join(", ")}
      >
        <div className="border-rule pointer-events-none relative z-10 flex items-center justify-between gap-3 border-b px-4 py-3">
          <span className="flex min-w-0 items-center gap-2.5 font-semibold">
            {view.place != null ? <PlaceChip place={view.place} /> : null}
            <span className="truncate">{view.headline}</span>
          </span>
          <span className="text-muted-foreground text-meta shrink-0">
            {view.day}
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
              {view.title}
            </p>
            <p className="text-muted-foreground text-meta mt-0.5">
              {view.summary}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InitialsMark name={view.viewerTeam.markName} isViewer />
            <div className="min-w-0">
              <p dir="auto" className="text-meta truncate font-semibold">
                {view.viewerTeam.name}
              </p>
              {view.startedLine ? (
                <p className="text-muted-foreground text-meta">
                  {view.startedLine}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {view.king ? (
          <div className="border-rule pointer-events-none relative z-10 flex items-center gap-3 border-t px-4 py-3">
            <InitialsMark
              name={view.king.markName}
              isViewer={view.king.isViewer}
              className="size-7 text-[11px]"
            />
            <span className="text-meta min-w-0 flex-1 truncate">
              <CrownIcon
                aria-hidden="true"
                className="me-1.5 inline size-3.5 align-[-2px]"
              />
              {view.king.label}{" "}
              <span dir="auto" className="font-semibold">
                {view.king.name}
              </span>
            </span>
            <span className="text-muted-foreground text-meta shrink-0">
              {view.king.trailing}
            </span>
          </div>
        ) : null}
      </SummaryCardShell>
    </li>
  );
}
