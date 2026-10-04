import { spacing } from "@repo/design-tokens";
import { COMPLETE_MATCH_ACTION, setLabel } from "@repo/domain/game-copy";
import { useEffect, useState } from "react";
import { View } from "react-native";

import {
  draftsFromSets,
  setsToSave,
  withDraftChange,
  type ScoreDrafts,
} from "../game-details/details-model";
import { Card } from "../home/card";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import {
  SCORE_SECTION_NOTE,
  SCORE_SECTION_TITLE,
  type ScorableMatch,
} from "./tournament-model";

const BOX_WIDTH = 64;

export type ScoreHandlers = {
  scorePending: boolean;
  addSetPending: boolean;
  completePending: boolean;
  onSave: (matchId: string, payloads: ReturnType<typeof setsToSave>) => void;
  onAddSet: (matchId: string) => void;
  onComplete: (
    matchId: string,
    payloads: ReturnType<typeof setsToSave>,
  ) => void;
};

function MatchScore({
  match,
  handlers,
}: {
  match: ScorableMatch;
  handlers: ScoreHandlers;
}) {
  const [drafts, setDrafts] = useState<ScoreDrafts>(() =>
    draftsFromSets(match.sets),
  );
  useEffect(() => {
    setDrafts(draftsFromSets(match.sets));
  }, [match.sets]);

  const busy =
    handlers.scorePending || handlers.addSetPending || handlers.completePending;
  const payloads = () => setsToSave(match.sets, drafts);

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
      {match.sets.map((set, index) => {
        const name = setLabel(index);
        const draft = drafts[set.id] ?? { slot1: "", slot2: "" };
        return (
          <View
            key={set.id}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text size="meta" tone="muted" style={{ width: 52 }}>
              {name}
            </Text>
            <View style={{ width: BOX_WIDTH }}>
              <TextField
                accessibilityLabel={`${match.slot1Label}, ${name}`}
                keyboardType="number-pad"
                maxLength={2}
                value={draft.slot1}
                editable={!busy}
                textAlign="center"
                onChangeText={(text) =>
                  setDrafts((current) => withDraftChange(current, set, 1, text))
                }
              />
            </View>
            <View style={{ width: BOX_WIDTH }}>
              <TextField
                accessibilityLabel={`${match.slot2Label}, ${name}`}
                keyboardType="number-pad"
                maxLength={2}
                value={draft.slot2}
                editable={!busy}
                textAlign="center"
                onChangeText={(text) =>
                  setDrafts((current) => withDraftChange(current, set, 2, text))
                }
              />
            </View>
          </View>
        );
      })}
      {match.note ? (
        <Text size="meta" tone="muted" accessibilityRole="alert">
          {match.note}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button
          label="Add a Set"
          variant="outline"
          size="sm"
          pending={handlers.addSetPending}
          disabled={busy}
          onPress={() => handlers.onAddSet(match.id)}
        />
        {match.sets.length > 0 ? (
          <>
            <Button
              label="Save score"
              size="sm"
              pending={handlers.scorePending}
              disabled={busy}
              onPress={() => handlers.onSave(match.id, payloads())}
            />
            <Button
              label={COMPLETE_MATCH_ACTION}
              size="sm"
              variant="outline"
              pending={handlers.completePending}
              disabled={busy}
              onPress={() => handlers.onComplete(match.id, payloads())}
            />
          </>
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
  if (matches.length === 0) {
    return null;
  }
  return (
    <Card title={SCORE_SECTION_TITLE}>
      <Text
        size="meta"
        tone="muted"
        style={{ paddingHorizontal: spacing.surface, paddingBottom: 4 }}
      >
        {SCORE_SECTION_NOTE}
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
