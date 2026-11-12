import { radii, sizes, spacing } from "@repo/design-tokens";
import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import {
  scoreDeciderNote,
  scoreGamesRangeNote,
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
  organizerConfirmNote,
  scoreCanConfirm,
  scoreCanEnter,
  scoreConfirmWindowLine,
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
  scoreShownSets,
  type FriendlyScorePhase,
  type ScoreConfirmWindow,
  type SetBoxState,
} from "@repo/domain/friendly-game-score";
import { setLabel } from "@repo/domain/game-copy";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  draftsOutOfRange,
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
  const locale = useLocale();
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
      accessibilityLabel={scoreSetBoxAccessibleLabel(
        state,
        label,
        value,
        locale,
      )}
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
  stampedByName,
}: {
  phase: FriendlyScorePhase;
  confirmedAtLabel: string | null;
  confirmedByOrganizer: boolean;
  stampedByName: string | null;
}) {
  const palette = useTonePalette();
  const locale = useLocale();
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
        {scoreFooterNote(
          phase,
          confirmedAtLabel,
          locale,
          confirmedByOrganizer,
          stampedByName,
        )}
      </Text>
    </View>
  );
}

/** A Verifier of the Venue, not seated in the Match, stamps its score (ADR-0072). */
function VerifierStamp({
  pending,
  onStamp,
}: {
  pending: boolean;
  onStamp: () => void;
}) {
  const m = useMessages();
  const copy = m.rating.verifier.stamp;
  return (
    <View style={{ gap: 10 }}>
      <Hairline />
      <Text size="meta" tone="muted">
        {copy.note}
      </Text>
      <View style={{ flexDirection: "row" }}>
        <Button
          label={copy.action}
          variant="outline"
          size="sm"
          pending={pending}
          onPress={onStamp}
        />
      </View>
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
  windowLine,
}: {
  confirmation: FriendlyGameDetailsConfirmation;
  viewerUserId: string;
  names: ReadonlyMap<string, string>;
  canConfirm: boolean;
  organizerCanConfirm: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
  windowLine: string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const rows = scoreConfirmationRows(confirmation, viewerUserId, names, locale);
  const waitingLines = scoreOrganizerWaitingLines(confirmation, locale);
  return (
    <View style={{ gap: 10 }}>
      <Hairline />
      <Text size="meta" weight="medium">
        {m.mobileGameDetails.score.confirmations}
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
      {windowLine ? (
        <Text size="meta" tone="muted">
          {windowLine}
        </Text>
      ) : null}
      {organizerCanConfirm || canConfirm ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={
              organizerCanConfirm
                ? m.mobileGameDetails.score.confirmScore
                : m.mobileGameDetails.score.confirmResult
            }
            variant="outline"
            size="sm"
            pending={confirmPending}
            onPress={onConfirm}
          />
        </View>
      ) : null}
      {organizerCanConfirm ? (
        <Text size="meta" tone="muted">
          {organizerConfirmNote(locale)}
        </Text>
      ) : null}
    </View>
  );
}

/** Before the Game: one row that says when the score opens. */
function LockedScore({ courtFull }: { courtFull: boolean }) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const lockedLine = scoreLockedLine(courtFull, locale);
  return (
    <Surface
      accessible
      accessibilityLabel={m.mobileGameDetails.score.lockedLabel(lockedLine)}
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
        <Text weight="semibold">{m.mobileGameDetails.score.title}</Text>
        <Text size="meta" tone="muted">
          {lockedLine}
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
  confirmWindow = null,
  isOrganizer,
  courtFull,
  scorePending,
  confirmPending,
  stampPending = false,
  onSaveSets,
  onConfirm,
  onStamp,
}: {
  phase: FriendlyScorePhase;
  match: FriendlyGameDetailsMatch;
  sides: FriendlyGameDetailsSide[];
  viewerUserId: string;
  winningGameTeamId: string | null;
  confirmation: FriendlyGameDetailsConfirmation | null;
  /** A Public Game's 24 hours for the other side (ADR-0071). */
  confirmWindow?: ScoreConfirmWindow | null;
  isOrganizer: boolean;
  courtFull: boolean;
  scorePending: boolean;
  confirmPending: boolean;
  stampPending?: boolean;
  onSaveSets: (payloads: ReturnType<typeof setsToSave>) => void;
  onConfirm: () => void;
  onStamp?: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [drafts, setDrafts] = useState<ScoreDrafts>(() =>
    draftsFromSets(match.sets),
  );
  useEffect(() => {
    setDrafts(draftsFromSets(match.sets));
  }, [match.sets]);
  const now = useNow();

  if (scorePhaseFlags(phase).isUpcoming) {
    return <LockedScore courtFull={courtFull} />;
  }

  const canEnter = scoreCanEnter(phase, match.canScoreSets);
  const shownSets = scoreShownSets(phase, match.sets);
  const outOfRange = canEnter && draftsOutOfRange(drafts);
  const hasResult = match.outcome.result !== "none";
  const names = scoreNameByUserId(sides);
  const canConfirm = scoreCanConfirm({
    confirmation,
    hasResult,
    phase,
    viewerUserId,
    confirmWindow,
  });
  const organizerCanConfirm = scoreOrganizerCanConfirm({
    confirmation,
    hasResult,
    phase,
    isOrganizer,
  });
  const deciderNote = canEnter
    ? scoreDeciderNote(match.sets.length, locale)
    : null;

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
          {m.mobileGameDetails.score.title}
        </Text>
        <Text size="meta" tone="muted">
          {scoreSetsMeta(shownSets.length, locale)}
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
          {shownSets.map((set, index) => (
            <Text
              key={set.id}
              size="eyebrow"
              tone="muted"
              uppercase
              style={{ width: BOX_WIDTH, textAlign: "center" }}
            >
              {setLabel(index, locale)}
            </Text>
          ))}
        </View>

        {sides.map((side) => {
          const sideLabel = formatGameSideLabel(
            "friendly_game",
            side.sideIndex,
            locale,
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
                  {scoreTeamFirstNames(side, locale)}
                </Text>
              </View>
              {shownSets.map((set, index) => {
                const setName = setLabel(index, locale);
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
                    label={m.mobileGameDetails.score.setBox(sideLabel, setName)}
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

        {outOfRange ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {scoreGamesRangeNote(locale)}
          </Text>
        ) : null}

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
              label={m.mobileGameDetails.score.save}
              size="sm"
              pending={scorePending}
              disabled={outOfRange}
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
            windowLine={scoreConfirmWindowLine(confirmWindow, now, locale)}
          />
        ) : null}

        {match.canStamp && onStamp ? (
          <VerifierStamp pending={stampPending} onStamp={onStamp} />
        ) : null}

        {canEnter ? null : (
          <FooterNote
            phase={phase}
            confirmedAtLabel={
              confirmation?.confirmedAt
                ? formatAbsoluteDay(confirmation.confirmedAt, locale)
                : null
            }
            confirmedByOrganizer={confirmation?.confirmedByOrganizer ?? false}
            stampedByName={match.stamp?.verifierName ?? null}
          />
        )}
      </View>
    </Surface>
  );
}
