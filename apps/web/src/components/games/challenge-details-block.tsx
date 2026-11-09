"use client";

import { challengeGameDetailsRows } from "@repo/domain/challenge-game-details";
import type { Locale } from "@repo/i18n/locale";

import { ChallengeTeamVsTeam } from "~/components/games/challenge-team-vs-team";
import {
  FootballInfoRows,
  type FootballInfoRow,
} from "~/components/games/football-info-rows";
import { useLocale } from "~/components/locale-provider";
import type { RouterOutputs } from "~/trpc/react";

type GameChallenge = NonNullable<RouterOutputs["games"]["byId"]["challenge"]>;

/** "From challenge", "Proposed by", "Pitch" or "Court", "Cost" and "Counts for". */
export function challengeInfoRows(
  challenge: GameChallenge,
  sport: string | null,
  locale: Locale,
): FootballInfoRow[] {
  return challengeGameDetailsRows(
    {
      sport,
      postedByTeamName: challenge.postedByTeamName,
      postedAt: challenge.postedAt,
      proposedByTeamName: challenge.proposedBy.teamName,
      confirmedByName: challenge.confirmedBy.name,
      confirmedByViewer: challenge.confirmedBy.isViewer,
      venueName: challenge.pitch.venueName,
      courtName: challenge.pitch.courtName,
      costLine: challenge.costLine,
    },
    locale,
  );
}

/** A padel Challenge Game's team-vs-team row and details; its pairs show as the court Line-up. */
export function ChallengeDetailsBlock({
  challenge,
  sport,
}: {
  challenge: GameChallenge;
  sport: string | null;
}) {
  const locale = useLocale();
  return (
    <div className="space-y-3">
      <div className="border-rule bg-paper rounded-xl border p-5">
        <ChallengeTeamVsTeam sides={challenge.sides} sport={sport} />
      </div>
      <FootballInfoRows rows={challengeInfoRows(challenge, sport, locale)} />
    </div>
  );
}
