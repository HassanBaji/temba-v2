"use client";

import { challengeGameDetailsRows } from "@repo/domain/challenge-game-details";
import type { Locale } from "@repo/i18n/locale";

import { ChallengeTeamVsTeam } from "~/components/games/challenge-team-vs-team";
import {
  FootballInfoRows,
  type FootballInfoRow,
} from "~/components/games/football-info-rows";
import { useLocale, useMessages } from "~/components/locale-provider";
import type { RouterOutputs } from "~/trpc/react";

type GameChallenge = NonNullable<RouterOutputs["games"]["byId"]["challenge"]>;

/** "From", "Agreed", "Pitch" or "Court" with "Book it yourselves", "Cost" and "Counts for". */
export function challengeInfoRows(
  challenge: GameChallenge,
  sport: string | null,
  separator: string,
  locale: Locale,
): FootballInfoRow[] {
  return challengeGameDetailsRows(
    {
      sport,
      postedByTeamName: challenge.postedByTeamName,
      proposedByName: challenge.proposedBy.name,
      confirmedByName: challenge.confirmedBy.name,
      venueName: challenge.pitch.venueName,
      courtName: challenge.pitch.courtName,
      costLine: challenge.costLine,
    },
    locale,
  ).map((row) => ({
    label: row.label,
    value: row.hint ? `${row.value}${separator}${row.hint}` : row.value,
  }));
}

/** A padel Challenge Game's team-vs-team row and details; its pairs show as the court Line-up. */
export function ChallengeDetailsBlock({
  challenge,
  sport,
}: {
  challenge: GameChallenge;
  sport: string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div className="space-y-3">
      <div className="border-rule bg-paper rounded-xl border p-5">
        <ChallengeTeamVsTeam sides={challenge.sides} sport={sport} />
      </div>
      <FootballInfoRows
        rows={challengeInfoRows(
          challenge,
          sport,
          m.group.metaSeparator,
          locale,
        )}
      />
    </div>
  );
}
