"use client";

import {
  americanoPlayedCardModel,
  americanoResultMark,
  type AmericanoPlayedSummary,
} from "@repo/domain/tournament-americano-view";

import { SummaryCardShell } from "~/components/games/summary-card-shell";
import { ResultMark } from "~/components/temba/result-mark";
import { useLocale, useMessages } from "~/components/locale-provider";

import { PlaceChip } from "./tournament-finished-parts";
import { InitialsMark } from "./tournament-round-parts";

type AmericanoPlayedGame = {
  id: string;
  name: string | null;
  windowStart: Date | null;
  displayTime: Date;
  groupName: string | null;
  venue: { name: string };
  americano: AmericanoPlayedSummary;
};

/** 4b: one card for the whole day: the viewer's place, results and the winner. */
export function AmericanoPlayedCard({ game }: { game: AmericanoPlayedGame }) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const view = americanoPlayedCardModel(game, locale);

  return (
    <li data-slot="americano-played-card">
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
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-eyebrow flex items-center gap-1.5 uppercase tracking-[0.06em]">
              <span className="border-rule rounded-sm border px-1.5 py-0.5">
                {messages.tournament.home.eyebrowPrefix}
              </span>
              <span className="border-rule rounded-sm border px-1.5 py-0.5">
                {m.chip}
              </span>
            </p>
            {game.groupName ? (
              <p
                dir="auto"
                className="text-muted-foreground text-meta min-w-0 truncate"
              >
                {game.groupName}
              </p>
            ) : null}
          </div>
          <div>
            <p className="font-expanded text-title leading-tight tracking-[-0.03em]">
              {view.title}
            </p>
            <p className="text-muted-foreground text-meta mt-0.5">
              {view.summary}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <InitialsMark name={game.americano.viewer.markName} isViewer />
            <div className="min-w-0 flex-1">
              <p className="text-meta font-semibold">{m.played.you}</p>
              <p className="text-muted-foreground text-meta">
                {view.viewerLine}
              </p>
            </div>
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {game.americano.results.map((result, index) => (
                <ResultMark
                  key={index}
                  variant={americanoResultMark(result)}
                  decorative
                  className="size-3.5"
                />
              ))}
            </span>
          </div>
        </div>
        {view.winner ? (
          <div className="border-rule pointer-events-none relative z-10 flex items-center gap-3 border-t px-4 py-3">
            <InitialsMark
              name={view.winner.markName}
              isViewer={view.winner.isViewer}
              className="size-7 text-[11px]"
            />
            <span dir="auto" className="text-meta min-w-0 flex-1 truncate">
              {view.winner.line}
            </span>
            <span className="text-meta shrink-0 font-semibold">
              {view.winner.trailing}
            </span>
          </div>
        ) : null}
      </SummaryCardShell>
    </li>
  );
}
