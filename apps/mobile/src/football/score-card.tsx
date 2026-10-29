import { radii, spacing } from "@repo/design-tokens";
import { footballResultLine } from "@repo/domain/football-lineup";
import { ORGANIZER_CONFIRM_NOTE } from "@repo/domain/friendly-game-score";
import { View } from "react-native";

import { Card } from "../home/card";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { BibChip } from "./bib-picker";
import {
  confirmationLine,
  shortName,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";

const PLACEHOLDER_HEIGHT = 56;

function Placeholder() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1, height: PLACEHOLDER_HEIGHT }}>
        <Hatch radius={radii.md} />
      </View>
      <Text tone="muted">–</Text>
      <View style={{ flex: 1, height: PLACEHOLDER_HEIGHT }}>
        <Hatch radius={radii.md} />
      </View>
    </View>
  );
}

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
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <BibChip bib={bib} size={14} />
        <Text size="meta" weight="semibold">
          {name}
        </Text>
      </View>
      <Text size="record" width="expanded" weight="bold">
        {String(goals)}
      </Text>
    </View>
  );
}

function Scorers({ players }: { players: readonly BoardPlayer[] }) {
  const scorers = players.filter((player) => player.goals > 0);
  if (scorers.length === 0) {
    return null;
  }
  return (
    <>
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 8 }}>
        <Text size="meta" tone="muted">
          Scorers
        </Text>
        {scorers
          .sort((a, b) => b.goals - a.goals)
          .map((player) => (
            <View
              key={player.userId}
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text>{player.isViewer ? "You" : shortName(player.name)}</Text>
              <Text weight="semibold">
                {player.goals === 1 ? "1 goal" : `${player.goals} goals`}
              </Text>
            </View>
          ))}
      </View>
    </>
  );
}

export type FootballScoreCardProps = {
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
  onEnterScore: () => void;
  onConfirm: () => void;
};

/**
 * The Score once teams are set: hatched until someone enters it, then the
 * goals, who still has to confirm, and who scored.
 */
export function FootballScoreCard(props: FootballScoreCardProps) {
  const score = props.match?.score ?? null;
  const completed = props.match?.status === "completed";
  if (!score) {
    return (
      <Card title="Score">
        <View
          style={{
            paddingHorizontal: spacing.surface,
            gap: 12,
            paddingBottom: spacing.surface,
          }}
        >
          <Placeholder />
          <Text size="meta" tone="muted">
            Entered by either side after the game, confirmed by the other.
          </Text>
          {props.canEnterScore ? (
            <Button label="Enter score" onPress={props.onEnterScore} />
          ) : null}
        </View>
      </Card>
    );
  }
  return (
    <Card
      title="Score"
      meta={completed ? "Confirmed" : "Waiting to confirm"}
      flush
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <SideScore
          bib={props.bibs.slot1}
          name={props.names.slot1}
          goals={score.slot1}
        />
        <Text size="title" tone="muted">
          –
        </Text>
        <SideScore
          bib={props.bibs.slot2}
          name={props.names.slot2}
          goals={score.slot2}
        />
      </View>
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Text weight="semibold">
            {footballResultLine(score, props.names)}
          </Text>
          <Text size="meta" tone="muted">
            {confirmationLine(
              props.match?.confirmed ?? { slot1: false, slot2: false },
              props.names,
              completed,
              props.match?.organizerSides,
            )}
            {props.match?.enteredByName
              ? ` Entered by ${props.match.enteredByName}.`
              : ""}
          </Text>
        </View>
        {props.canConfirm ||
        props.canConfirmAsOrganizer ||
        props.canEnterScore ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {props.canConfirm || props.canConfirmAsOrganizer ? (
              <Button
                label="Confirm score"
                pending={props.confirmPending}
                onPress={props.onConfirm}
              />
            ) : null}
            {props.canEnterScore ? (
              <Button
                label="Edit score"
                variant="outline"
                onPress={props.onEnterScore}
              />
            ) : null}
          </View>
        ) : null}
        {props.canConfirmAsOrganizer ? (
          <Text size="meta" tone="muted">
            {ORGANIZER_CONFIRM_NOTE}
          </Text>
        ) : null}
      </View>
      <Scorers players={props.players} />
    </Card>
  );
}
