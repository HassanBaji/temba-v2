import { sizes, spacing } from "@repo/design-tokens";
import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import type {
  FriendlyGameDetailsConfirmation,
  FriendlyGameDetailsMatch,
  FriendlyGameDetailsSide,
} from "@repo/domain/friendly-game-details";
import {
  scoreCanConfirm,
  scoreCanEnter,
  scoreConfirmationRows,
  scoreFooterNote,
  scoreGamesWonForSide,
  scoreNameByUserId,
  scorePhaseFlags,
  scoreSetBoxAccessibleLabel,
  scoreSetBoxState,
  scoreSetNeverPlayed,
  scoreShowsConfirmations,
  scoreTeamNamesLabel,
  type FriendlyScorePhase,
  type SetBoxState,
} from "@repo/domain/friendly-game-score";
import { setLabel } from "@repo/domain/game-copy";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Card } from "../home/card";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import {
  draftsFromSets,
  setsToSave,
  withDraftChange,
  type ScoreDrafts,
} from "./details-model";

const BOX_WIDTH = 64;
const BOX_HEIGHT = sizes.touchTarget + 4;
const OUTLINE_WIDTH = 1.5;

function SetBox({
  state,
  value,
  label,
  draft,
  saving,
  onChangeText,
}: {
  state: SetBoxState;
  value: number | null;
  label: string;
  draft: string;
  saving: boolean;
  onChangeText: (text: string) => void;
}) {
  const palette = useTonePalette();
  const frame = { width: BOX_WIDTH, height: BOX_HEIGHT, borderRadius: 5 };

  if (state === "locked" || state === "unplayed") {
    return (
      <View style={frame}>
        <Hatch />
      </View>
    );
  }

  if (state === "enterable") {
    return (
      <View style={{ width: BOX_WIDTH }}>
        <TextField
          accessibilityLabel={label}
          keyboardType="number-pad"
          maxLength={2}
          value={draft}
          editable={!saving}
          onChangeText={onChangeText}
          textAlign="center"
        />
      </View>
    );
  }

  const solid = state === "solid";
  const outline = state === "outline";
  return (
    <View
      accessible
      accessibilityLabel={scoreSetBoxAccessibleLabel(state, label, value)}
      style={[
        frame,
        {
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: solid ? palette.foreground : palette.background,
          borderWidth: outline
            ? OUTLINE_WIDTH
            : state === "readonly"
              ? hairline
              : 0,
          borderColor: palette.foreground,
        },
      ]}
    >
      {state === "readonly" ? <Hatch /> : null}
      <Text
        size="lead"
        weight="semibold"
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ color: solid ? palette.background : palette.foreground }}
      >
        {value ?? ""}
      </Text>
    </View>
  );
}

function FooterNote({
  phase,
  confirmedAtLabel,
}: {
  phase: FriendlyScorePhase;
  confirmedAtLabel: string | null;
}) {
  const palette = useTonePalette();
  const { isFinal } = scorePhaseFlags(phase);
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <View
        style={{
          marginTop: 3,
          width: 12,
          height: 12,
          borderRadius: 2,
          backgroundColor: isFinal ? palette.foreground : undefined,
        }}
      >
        {isFinal ? null : <Hatch radius={2} />}
      </View>
      <Text size="meta" tone="muted" style={{ flex: 1 }}>
        {scoreFooterNote(phase, confirmedAtLabel)}
      </Text>
    </View>
  );
}

function Confirmations({
  confirmation,
  viewerUserId,
  names,
  canConfirm,
  confirmPending,
  onConfirm,
}: {
  confirmation: FriendlyGameDetailsConfirmation;
  viewerUserId: string;
  names: ReadonlyMap<string, string>;
  canConfirm: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
}) {
  const rows = scoreConfirmationRows(confirmation, viewerUserId, names);
  return (
    <View style={{ gap: 10 }}>
      <Hairline />
      <Text size="meta" weight="medium">
        Confirmations
      </Text>
      {rows.map((row) => (
        <View
          key={row.userId}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" numberOfLines={1} style={{ flexShrink: 1 }}>
            {row.label}
          </Text>
          <Text
            size="meta"
            tone={row.confirmed ? "default" : "muted"}
            weight={row.confirmed ? "medium" : "regular"}
          >
            {row.status}
          </Text>
        </View>
      ))}
      {canConfirm ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label="Confirm result"
            variant="outline"
            size="sm"
            pending={confirmPending}
            onPress={onConfirm}
          />
        </View>
      ) : null}
    </View>
  );
}

export function ScoreCard({
  phase,
  match,
  sides,
  viewerUserId,
  winningGameTeamId,
  confirmation,
  scorePending,
  confirmPending,
  onSaveSets,
  onConfirm,
}: {
  phase: FriendlyScorePhase;
  match: FriendlyGameDetailsMatch;
  sides: FriendlyGameDetailsSide[];
  viewerUserId: string;
  winningGameTeamId: string | null;
  confirmation: FriendlyGameDetailsConfirmation | null;
  scorePending: boolean;
  confirmPending: boolean;
  onSaveSets: (payloads: ReturnType<typeof setsToSave>) => void;
  onConfirm: () => void;
}) {
  const [drafts, setDrafts] = useState<ScoreDrafts>(() =>
    draftsFromSets(match.sets),
  );
  useEffect(() => {
    setDrafts(draftsFromSets(match.sets));
  }, [match.sets]);

  const canEnter = scoreCanEnter(phase, match.canScoreSets);
  const hasResult = match.outcome.result !== "none";
  const names = scoreNameByUserId(sides);
  const canConfirm = scoreCanConfirm({
    confirmation,
    hasResult,
    phase,
    viewerUserId,
  });

  return (
    <Card title="Score">
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
          gap: 16,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <View style={{ width: 52 }} />
          {sides.map((side) => (
            <View key={side.sideIndex} style={{ width: BOX_WIDTH }}>
              <Text size="eyebrow" weight="medium" tone="muted" uppercase>
                {formatGameSideLabel("friendly_game", side.sideIndex)}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 4 }}>
          {sides.map((side) => (
            <Text key={side.sideIndex} size="meta" numberOfLines={1}>
              {formatGameSideLabel("friendly_game", side.sideIndex)}:{" "}
              {scoreTeamNamesLabel(side)}
            </Text>
          ))}
        </View>

        {match.sets.map((set, index) => {
          const setName = setLabel(index);
          const draft = drafts[set.id] ?? { slot1: "", slot2: "" };
          const neverPlayed = scoreSetNeverPlayed(set);
          return (
            <View
              key={set.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Text size="meta" tone="muted" style={{ width: 52 }}>
                {setName}
              </Text>
              {sides.map((side) => {
                const state = scoreSetBoxState({
                  phase,
                  neverPlayed,
                  canEnter,
                  isWinningSide:
                    side.gameTeamId != null &&
                    side.gameTeamId === winningGameTeamId,
                });
                return (
                  <SetBox
                    key={side.sideIndex}
                    state={state}
                    value={scoreGamesWonForSide(set, side.sideIndex)}
                    label={`${formatGameSideLabel("friendly_game", side.sideIndex)}, ${setName}`}
                    draft={side.sideIndex === 1 ? draft.slot1 : draft.slot2}
                    saving={scorePending}
                    onChangeText={(text) =>
                      setDrafts((current) =>
                        withDraftChange(current, set, side.sideIndex, text),
                      )
                    }
                  />
                );
              })}
            </View>
          );
        })}

        {canEnter ? (
          <View style={{ flexDirection: "row" }}>
            <Button
              label="Save score"
              size="sm"
              pending={scorePending}
              onPress={() => onSaveSets(setsToSave(match.sets, drafts))}
            />
          </View>
        ) : null}

        {confirmation &&
        scoreShowsConfirmations({ confirmation, hasResult, phase }) ? (
          <Confirmations
            confirmation={confirmation}
            viewerUserId={viewerUserId}
            names={names}
            canConfirm={canConfirm}
            confirmPending={confirmPending}
            onConfirm={onConfirm}
          />
        ) : null}

        <FooterNote
          phase={phase}
          confirmedAtLabel={
            confirmation?.confirmedAt
              ? formatAbsoluteDay(confirmation.confirmedAt)
              : null
          }
        />
      </View>
    </Card>
  );
}
