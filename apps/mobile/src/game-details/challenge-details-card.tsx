import { challengeGameDetailsRows } from "@repo/domain/challenge-game-details";
import type { Locale } from "@repo/i18n/locale";
import { View } from "react-native";

import { InfoRows, type InfoRow } from "../football/info-rows";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import type { RouterOutputs } from "../trpc/react";
import { TeamVsTeamRow } from "./team-vs-team-row";

type GameChallenge = NonNullable<RouterOutputs["games"]["byId"]["challenge"]>;

/** "From", "Agreed", "Pitch" or "Court" with "Book it yourselves", "Cost" and "Counts for". */
export function challengeInfoRows(
  challenge: GameChallenge,
  sport: string | null,
  separator: string,
  locale: Locale,
): InfoRow[] {
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
export function ChallengeDetailsCard({
  challenge,
  sport,
}: {
  challenge: GameChallenge;
  sport: string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <View style={{ gap: 12 }}>
      <Surface>
        <TeamVsTeamRow sides={challenge.sides} sport={sport} />
      </Surface>
      <InfoRows
        rows={challengeInfoRows(
          challenge,
          sport,
          m.group.metaSeparator,
          locale,
        )}
      />
    </View>
  );
}
