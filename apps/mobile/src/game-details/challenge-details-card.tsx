import { challengeGameDetailsRows } from "@repo/domain/challenge-game-details";
import type { Locale } from "@repo/i18n/locale";
import { View } from "react-native";

import { InfoRows, type InfoRow } from "../football/info-rows";
import { useLocale } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import type { RouterOutputs } from "../trpc/react";
import { TeamVsTeamRow } from "./team-vs-team-row";

type GameChallenge = NonNullable<RouterOutputs["games"]["byId"]["challenge"]>;

/** "From challenge", "Proposed by", "Pitch" or "Court", "Cost" and "Counts for". */
export function challengeInfoRows(
  challenge: GameChallenge,
  sport: string | null,
  rated: boolean,
  locale: Locale,
): InfoRow[] {
  return challengeGameDetailsRows(
    {
      sport,
      rated,
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
export function ChallengeDetailsCard({
  challenge,
  sport,
  rated,
}: {
  challenge: GameChallenge;
  sport: string | null;
  rated: boolean;
}) {
  const locale = useLocale();
  return (
    <View style={{ gap: 12 }}>
      <Surface>
        <TeamVsTeamRow sides={challenge.sides} sport={sport} />
      </Surface>
      <InfoRows rows={challengeInfoRows(challenge, sport, rated, locale)} />
    </View>
  );
}
