"use client";

import {
  confirmationLine,
  shortName,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { footballResultLine } from "@repo/domain/football-lineup";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";

import { BibChip } from "./football-bibs";

function SideScore({
  bib,
  name,
  goals,
}: {
  bib: Bibs["slot1"];
  name: string;
  goals: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="text-meta flex items-center gap-1.5 font-semibold">
        <BibChip bib={bib} className="size-3.5" />
        {name}
      </span>
      <span className="font-expanded text-[52px] tabular-nums leading-none">
        {goals}
      </span>
    </div>
  );
}

export function FootballScoreCard({
  bibs,
  names,
  players,
  match,
  canEnterScore,
  canConfirm,
  canConfirmAsOrganizer,
  confirmPending,
  scoreHref,
  onConfirm,
}: {
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  players: readonly BoardPlayer[];
  match: {
    status: string | null;
    score: { slot1: number; slot2: number } | null;
    confirmed: { slot1: boolean; slot2: boolean };
    organizerSides?: { slot: 1 | 2; confirmed: boolean }[];
    enteredByName: string | null;
  } | null;
  canEnterScore: boolean;
  canConfirm: boolean;
  canConfirmAsOrganizer: boolean;
  confirmPending: boolean;
  scoreHref: string;
  onConfirm: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const score = match?.score ?? null;
  const completed = match?.status === "completed";
  const scorers = players
    .filter((player) => player.goals > 0)
    .sort((a, b) => b.goals - a.goals);

  return (
    <section
      aria-labelledby="football-score-heading"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <div className="text-muted-foreground text-meta flex justify-between px-5 pt-5">
        <h2 id="football-score-heading">{m.game.played.score}</h2>
        {score ? (
          <span>
            {completed
              ? m.game.played.confirmed
              : m.webTournament.footballScore.waitingToConfirm}
          </span>
        ) : null}
      </div>
      {score ? (
        <>
          <div className="flex items-center px-5 py-4">
            <SideScore
              bib={bibs.slot1}
              name={names.slot1}
              goals={score.slot1}
            />
            <span className="text-muted-foreground text-title">–</span>
            <SideScore
              bib={bibs.slot2}
              name={names.slot2}
              goals={score.slot2}
            />
          </div>
          <div className="border-rule space-y-3 border-t p-5">
            <div>
              <p className="font-semibold">
                {footballResultLine(score, names, locale)}
              </p>
              <p className="text-muted-foreground text-meta">
                {confirmationLine(
                  match?.confirmed ?? { slot1: false, slot2: false },
                  names,
                  completed,
                  locale,
                  match?.organizerSides,
                )}
                {match?.enteredByName
                  ? ` ${m.webTournament.footballScore.enteredBySentence(match.enteredByName)}`
                  : ""}
              </p>
            </div>
            {canConfirm || canConfirmAsOrganizer || canEnterScore ? (
              <div className="flex flex-wrap gap-2">
                {canConfirm || canConfirmAsOrganizer ? (
                  <Button pending={confirmPending} onClick={onConfirm}>
                    {m.webTournament.footballScore.confirmScore}
                  </Button>
                ) : null}
                {canEnterScore ? (
                  <Button variant="outline" asChild>
                    <Link href={scoreHref}>
                      {m.webTournament.footballScore.editScore}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
            {canConfirmAsOrganizer ? (
              <p className="text-muted-foreground text-meta">
                {m.game.score.organizerConfirmNote}
              </p>
            ) : null}
          </div>
          {scorers.length > 0 ? (
            <div className="border-rule space-y-2 border-t p-5">
              <h3 className="text-muted-foreground text-meta">
                {m.webTournament.footballScore.scorers}
              </h3>
              <ul className="space-y-1">
                {scorers.map((player) => (
                  <li key={player.userId} className="flex justify-between">
                    <span>
                      {player.isViewer ? m.common.you : shortName(player.name)}
                    </span>
                    <span className="font-semibold">
                      {m.game.played.goals(player.goals)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3 p-5 pt-3">
          <div className="flex items-center gap-2.5" aria-hidden="true">
            <span className="relative h-14 flex-1 overflow-hidden rounded-md">
              <Hatch radius="md" className="absolute inset-0" />
            </span>
            <span className="text-muted-foreground">–</span>
            <span className="relative h-14 flex-1 overflow-hidden rounded-md">
              <Hatch radius="md" className="absolute inset-0" />
            </span>
          </div>
          <p className="text-muted-foreground text-meta">
            {m.webTournament.footballScore.emptyNote}
          </p>
          {canEnterScore ? (
            <Button asChild>
              <Link href={scoreHref}>
                {m.webTournament.footballScore.enterScore}
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
