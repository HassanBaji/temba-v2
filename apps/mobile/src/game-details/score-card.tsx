import { radii, sizes, spacing } from "@repo/design-tokens";
import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import {
  scoreDeciderNote,
  scoreLockedLine,
  scoreSetsMeta,
  scoreTeamFirstNames,
} from "@repo/domain/friendly-game-court";
import type {
  FriendlyGameDetailsConfirmation,
  FriendlyGameDetailsMatch,
  FriendlyGameDetailsSide,
} from "@repo/domain/friendly-game-details";
import {
  ORGANIZER_CONFIRM_NOTE,
  scoreCanConfirm,
  scoreCanEnter,
  scoreConfirmationRows,
  scoreFooterNote,
  scoreGamesWonForSide,
  scoreNameByUserId,
  scoreOrganizerCanConfirm,
  scoreOrganizerWaitingLines,
  scorePhaseFlags,
  scoreSetBoxAccessibleLabel,
  scoreSetBoxState,
  scoreSetNeverPlayed,
  scoreShowsConfirmations,
  type FriendlyScorePhase,
  type SetBoxState,
} from "@repo/domain/friendly-game-score";
import { setLabel } from "@repo/domain/game-copy";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import {
  draftsFromSets,
  setsToSave,
  withDraftChange,
  type ScoreDrafts,
} from "./details-model";

const BOX_WIDTH = 56;
const BOX_HEIGHT = sizes.touchTarget + 4;
const BOX_GAP = 8;
const OUTLINE_WIDTH = 1.5;
const LOCK_TILE = 40;
const LOCKED_BARS = 3;

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
  confirmedByOrganizer,
}: {
  phase: FriendlyScorePhase;
  confirmedAtLabel: string | null;
  confirmedByOrganizer: boolean;
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
        {scoreFooterNote(phase, confirmedAtLabel, confirmedByOrganizer)}
      </Text>
    </View>
  );
}

function Confirmations({
  confirmation,
  viewerUserId,
  names,
  canConfirm,
  organizerCanConfirm,
  confirmPending,
  onConfirm,
}: {
  confirmation: FriendlyGameDetailsConfirmation;
  viewerUserId: string;
  names: ReadonlyMap<string, string>;
  canConfirm: boolean;
  organizerCanConfirm: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
}) {
  const rows = scoreConfirmationRows(confirmation, viewerUserId, names);
  const waitingLines = scoreOrganizerWaitingLines(confirmation);
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
      {waitingLines.map((line) => (
        <Text key={line} size="meta" tone="muted">
          {line}
        </Text>
      ))}
      {organizerCanConfirm || canConfirm ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={organizerCanConfirm ? "Confirm score" : "Confirm result"}
            variant="outline"
            size="sm"
            pending={confirmPending}
            onPress={onConfirm}
          />
        </View>
      ) : null}
      {organizerCanConfirm ? (
        <Text size="meta" tone="muted">
          {ORGANIZER_CONFIRM_NOTE}
        </Text>
      ) : null}
    </View>
  );
}

/** Before the Game: one row that says when the score opens. */
function LockedScore({ courtFull }: { courtFull: boolean }) {
  const palette = useTonePalette();
  return (
    <Surface
      accessible
      accessibilityLabel={`Score. ${scoreLockedLine(courtFull)}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
    >
      <View
        style={{
          width: LOCK_TILE,
          height: LOCK_TILE,
          borderRadius: radii.md,
          backgroundColor: palette.wash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lock size={17} color={palette.muted} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">Score</Text>
        <Text size="meta" tone="muted">
          {scoreLockedLine(courtFull)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: LOCKED_BARS }, (_, index) => (
          <View key={index} style={{ width: 14, height: 22 }}>
            <Hatch radius={3} />
          </View>
        ))}
      </View>
    </Surface>
  );
}

export function ScoreCard({
  phase,
  match,
  sides,
  viewerUserId,
  winningGameTeamId,
  confirmation,
  isOrganizer,
  courtFull,
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
  isOrganizer: boolean;
  courtFull: boolean;
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

  if (scorePhaseFlags(phase).isUpcoming) {
    return <LockedScore courtFull={courtFull} />;
  }

  const canEnter = scoreCanEnter(phase, match.canScoreSets);
  const hasResult = match.outcome.result !== "none";
  const names = scoreNameByUserId(sides);
  const canConfirm = scoreCanConfirm({
    confirmation,
    hasResult,
    phase,
    viewerUserId,
  });
  const organizerCanConfirm = scoreOrganizerCanConfirm({
    confirmation,
    hasResult,
    phase,
    isOrganizer,
  });
  const deciderNote = canEnter ? scoreDeciderNote(match.sets.length) : null;

  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: spacing.compact,
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        <Text size="lead" weight="semibold" accessibilityRole="header">
          Score
        </Text>
        <Text size="meta" tone="muted">
          {scoreSetsMeta(match.sets.length)}
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: spacing.compact,
          paddingBottom: spacing.compact,
          gap: 10,
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: BOX_GAP }}
        >
          <View style={{ flex: 1 }} />
          {match.sets.map((set, index) => (
            <Text
              key={set.id}
              size="eyebrow"
              tone="muted"
              uppercase
              style={{ width: BOX_WIDTH, textAlign: "center" }}
            >
              {setLabel(index)}
            </Text>
          ))}
        </View>

        {sides.map((side) => {
          const sideLabel = formatGameSideLabel(
            "friendly_game",
            side.sideIndex,
          );
          return (
            <View
              key={side.sideIndex}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: BOX_GAP,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="eyebrow" weight="semibold" tone="muted" uppercase>
                  {sideLabel}
                </Text>
                <Text weight="medium" numberOfLines={1}>
                  {scoreTeamFirstNames(side)}
                </Text>
              </View>
              {match.sets.map((set, index) => {
                const setName = setLabel(index);
                const draft = drafts[set.id] ?? { slot1: "", slot2: "" };
                const state = scoreSetBoxState({
                  phase,
                  neverPlayed: scoreSetNeverPlayed(set),
                  canEnter,
                  isWinningSide:
                    side.gameTeamId != null &&
                    side.gameTeamId === winningGameTeamId,
                });
                return (
                  <SetBox
                    key={set.id}
                    state={state}
                    value={scoreGamesWonForSide(set, side.sideIndex)}
                    label={`${sideLabel}, ${setName}`}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingTop: 6,
            }}
          >
            <Text size="meta" tone="muted" style={{ flex: 1 }}>
              {deciderNote ?? ""}
            </Text>
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
            organizerCanConfirm={organizerCanConfirm}
            confirmPending={confirmPending}
            onConfirm={onConfirm}
          />
        ) : null}

        {canEnter ? null : (
          <FooterNote
            phase={phase}
            confirmedAtLabel={
              confirmation?.confirmedAt
                ? formatAbsoluteDay(confirmation.confirmedAt)
                : null
            }
            confirmedByOrganizer={confirmation?.confirmedByOrganizer ?? false}
          />
        )}
      </View>
    </Surface>
  );
}
