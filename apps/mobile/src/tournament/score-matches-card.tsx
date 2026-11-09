import { spacing } from "@repo/design-tokens";
import { scoreGamesRangeNote } from "@repo/domain/friendly-game-court";
import { friendlySetGamesInRange } from "@repo/domain/friendly-game-results";
import { setLabel } from "@repo/domain/game-copy";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { digitsOnly } from "../game-details/details-model";
import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { type ScorableMatch } from "./tournament-model";

const BOX_WIDTH = 64;

export type TournamentScore = { slot1GamesWon: number; slot2GamesWon: number };

export type ScoreHandlers = {
  scorePending: boolean;
  confirmPending: boolean;
  onSave: (matchId: string, score: TournamentScore) => void;
  onConfirm: (matchId: string) => void;
};

type GamesDraft = { slot1: string; slot2: string };

function draftOf(sets: ScorableMatch["sets"]): GamesDraft {
  const [set] = sets;
  return {
    slot1: set?.slot1GamesWon == null ? "" : String(set.slot1GamesWon),
    slot2: set?.slot2GamesWon == null ? "" : String(set.slot2GamesWon),
  };
}

function scoreOf(draft: GamesDraft): TournamentScore | null {
  if (draft.slot1 === "" || draft.slot2 === "") {
    return null;
  }
  return {
    slot1GamesWon: Number(draft.slot1),
    slot2GamesWon: Number(draft.slot2),
  };
}

/**
 * A tournament score is the games each team won, as one Set (ADR-0062), saved
 * through `games.enterTournamentScore`, which asks the other team to confirm.
 * That team confirms it through `games.confirmMatchResult`, or corrects it.
 */
function MatchScore({
  match,
  handlers,
}: {
  match: ScorableMatch;
  handlers: ScoreHandlers;
}) {
  const locale = useLocale();
  const m = useMessages().mobileTournament.score;
  const [draft, setDraft] = useState<GamesDraft>(() => draftOf(match.sets));
  useEffect(() => {
    setDraft(draftOf(match.sets));
  }, [match.sets]);

  const score = scoreOf(draft);
  const outOfRange = [draft.slot1, draft.slot2].some(
    (text) => text !== "" && !friendlySetGamesInRange(Number(text)),
  );
  const name = setLabel(0, locale);
  const busy = handlers.scorePending || handlers.confirmPending;
  const editable = match.canEnter && !busy;

  return (
    <View style={{ gap: 12, padding: spacing.surface }}>
      <Text size="body" weight="semibold">
        {match.heading}
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Text size="meta" numberOfLines={2} style={{ flex: 1 }}>
          {match.slot1Label}
        </Text>
        <Text
          size="meta"
          tone="muted"
          numberOfLines={2}
          style={{ flex: 1, textAlign: "right" }}
        >
          {match.slot2Label}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: BOX_WIDTH }}>
          <TextField
            accessibilityLabel={m.box(match.slot1Label, name)}
            keyboardType="number-pad"
            maxLength={2}
            value={draft.slot1}
            editable={editable}
            textAlign="center"
            onChangeText={(text) =>
              setDraft((current) => ({ ...current, slot1: digitsOnly(text) }))
            }
          />
        </View>
        <View style={{ width: BOX_WIDTH }}>
          <TextField
            accessibilityLabel={m.box(match.slot2Label, name)}
            keyboardType="number-pad"
            maxLength={2}
            value={draft.slot2}
            editable={editable}
            textAlign="center"
            onChangeText={(text) =>
              setDraft((current) => ({ ...current, slot2: digitsOnly(text) }))
            }
          />
        </View>
      </View>
      {outOfRange ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {scoreGamesRangeNote(locale)}
        </Text>
      ) : match.note ? (
        <Text size="meta" tone="muted" accessibilityRole="alert">
          {match.note}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {match.scoreToConfirm ? (
          <Button
            label={m.confirmScore(match.scoreToConfirm)}
            size="sm"
            pending={handlers.confirmPending}
            disabled={handlers.scorePending}
            onPress={() => handlers.onConfirm(match.id)}
          />
        ) : null}
        {match.canEnter ? (
          <Button
            label={m.saveScore}
            size="sm"
            variant={match.scoreToConfirm ? "outline" : undefined}
            pending={handlers.scorePending}
            disabled={score == null || outOfRange || handlers.confirmPending}
            onPress={() => {
              if (score) {
                handlers.onSave(match.id, score);
              }
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

export function ScoreMatchesCard({
  matches,
  handlers,
}: {
  matches: readonly ScorableMatch[];
  handlers: ScoreHandlers;
}) {
  const m = useMessages().mobileTournament.score;
  if (matches.length === 0) {
    return null;
  }
  return (
    <Card title={m.sectionTitle}>
      <Text
        size="meta"
        tone="muted"
        style={{ paddingHorizontal: spacing.surface, paddingBottom: 4 }}
      >
        {m.sectionNote}
      </Text>
      {matches.map((match) => (
        <View key={match.id}>
          <Hairline />
          <MatchScore match={match} handlers={handlers} />
        </View>
      ))}
    </Card>
  );
}
