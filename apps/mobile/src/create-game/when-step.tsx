import { spacing } from "@repo/design-tokens";
import {
  CREATE_FLOW_DURATIONS,
  CREATE_FLOW_MATCH_MINUTE_CHIPS,
  FRIENDLY_TOURNAMENT_UNEVEN_GROUPS,
  TOURNAMENT_FORMAT_LABEL,
  TOURNAMENT_SHAPE_OPTIONS,
  finishSlotForDuration,
  friendlyTournamentGroupsLine,
  matchingDurationPreset,
  parseCreateMatchMinutes,
  previewStartSlots,
} from "@repo/domain/create-game-flow";
import {
  friendlyTournamentPlan,
  type FriendlyTournamentPlan,
} from "@repo/domain/create-game-submit";
import {
  formatTimeSlotLabel,
  upcomingGameWindowTimeSlots,
} from "@repo/domain/game-window";
import {
  knockoutOnlyReviewValue,
  qualifiersConsequenceLine,
} from "@repo/domain/tournament-knockout";
import {
  formatRoundMatchesPerTeam,
  maxPoolCount,
  ROUND_MEETS_COPY,
  roundCountRange,
  ROUNDS_LABEL,
  SUGGESTED_ROUNDS_TAG,
  suggestedRoundsResetLabel,
} from "@repo/domain/tournament-sizing";
import { useState } from "react";
import { View } from "react-native";

import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { TextField } from "../primitives/text-field";
import { ChipGrid, FieldError, StepperCard, StepperRow } from "./chips";
import { tournamentScheduleSummary } from "./create-summary";
import { DayField } from "./day-field";
import { ScheduleCard } from "./schedule-card";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const TIME_COLUMNS = 3;

function DayAndStart({ state, now, errors, dispatch }: StepProps) {
  const { draft } = state;
  const [startExpanded, setStartExpanded] = useState(false);
  const slots = upcomingGameWindowTimeSlots(draft.day, now);
  const visibleStarts = previewStartSlots(
    slots,
    draft.startTime,
    startExpanded,
  );
  const startError =
    errors.windowStart && errors.windowStart !== "Pick a day"
      ? errors.windowStart
      : undefined;
  const dayError =
    errors.windowStart === "Pick a day" ? "Pick a day" : undefined;

  return (
    <>
      <DayField
        now={now}
        day={draft.day}
        error={dayError}
        onSelect={(day) => dispatch({ kind: "setDay", day, now })}
      />
      <StepSection title="Start time" note="30 minute steps">
        <ChipGrid
          label="Start time"
          columns={TIME_COLUMNS}
          chips={visibleStarts.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot),
          }))}
          isSelected={(slot) => slot === draft.startTime}
          onSelect={(slot) => dispatch({ kind: "setStart", slot })}
          escape={
            slots.length > visibleStarts.length
              ? {
                  label: "More",
                  accessibilityLabel: "More start times",
                  onPress: () => setStartExpanded(true),
                }
              : undefined
          }
        />
        <FieldError message={startError} />
      </StepSection>
    </>
  );
}

function Duration({ state, now, errors, dispatch }: StepProps) {
  const { draft } = state;
  const [customOpen, setCustomOpen] = useState(false);
  const preset = matchingDurationPreset(draft.startTime, draft.finishTime);
  const showCustom =
    customOpen || (Boolean(draft.finishTime) && preset == null);
  const slots = upcomingGameWindowTimeSlots(draft.day, now).filter(
    (slot) => slot > draft.startTime,
  );
  const durations = CREATE_FLOW_DURATIONS.map((minutes) => ({
    value: minutes,
    label: `${minutes} min`,
    disabled:
      !draft.startTime ||
      finishSlotForDuration(draft.startTime, minutes) == null,
  }));

  return (
    <StepSection
      title="Duration"
      note={
        draft.finishTime ? formatTimeSlotLabel(draft.finishTime) : undefined
      }
    >
      <ChipGrid
        label="Duration"
        columns={CREATE_FLOW_DURATIONS.length + 1}
        chips={durations}
        isSelected={(minutes) => !showCustom && minutes === preset}
        onSelect={(minutes) => {
          setCustomOpen(false);
          dispatch({ kind: "setDuration", minutes });
        }}
        escape={{
          label: "Set",
          selected: showCustom,
          accessibilityLabel: "Set a finish time",
          onPress: () => setCustomOpen(true),
        }}
      />
      {showCustom ? (
        <ChipGrid
          label="Finish time"
          columns={TIME_COLUMNS}
          chips={slots.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot),
          }))}
          isSelected={(slot) => slot === draft.finishTime}
          onSelect={(slot) => dispatch({ kind: "setFinish", slot })}
        />
      ) : null}
      <FieldError message={errors.windowEnd} />
    </StepSection>
  );
}

export function GameWhenStep(props: StepProps) {
  return (
    <View style={{ gap: spacing.section }}>
      <DayAndStart {...props} />
      <Duration {...props} />
      <View style={{ gap: 14 }}>
        <Hairline />
        <HelperNote>
          Day, start time, and finish time are required. Pick today or a later
          day. Times are in 30-minute intervals; for today, only upcoming times
          are listed.
        </HelperNote>
      </View>
    </View>
  );
}

export function TournamentWhenStep(props: StepProps) {
  const { state, now, dispatch } = props;
  const { draft } = state;
  const plan = friendlyTournamentPlan(draft);
  const summary = tournamentScheduleSummary({
    plan,
    day: draft.day,
    startTime: draft.startTime,
    finishTime: draft.finishTime,
    matchMinutes: draft.matchMinutes,
    courtCount: draft.courtIds.length,
    now,
  });

  return (
    <View style={{ gap: spacing.section }}>
      <StepSection title={TOURNAMENT_FORMAT_LABEL} note="Required">
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {TOURNAMENT_SHAPE_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.id}
              role="radio"
              variant="row"
              title={option.title}
              description={option.description}
              selected={draft.tournamentShape === option.id}
              onPress={() => dispatch({ kind: "setShape", shape: option.id })}
            />
          ))}
        </View>
        <ShapeSteppers {...props} plan={plan} />
      </StepSection>
      <Rounds {...props} plan={plan} />
      <DayAndStart {...props} />
      <Finish {...props} />
      <GameLength
        {...props}
        lastFinish={summary?.kind === "schedule" ? summary.lastFinish : null}
      />
      {summary ? <ScheduleCard summary={summary} /> : null}
    </View>
  );
}

type PlanProps = StepProps & { plan: FriendlyTournamentPlan };

function ShapeSteppers({ state, errors, dispatch, plan }: PlanProps) {
  const { draft } = state;
  const { sizing, knockoutTree, qualifiersRange, poolKnockoutTree } = plan;

  if (plan.knockoutOnly) {
    return knockoutTree ? (
      <HelperNote>{knockoutOnlyReviewValue(knockoutTree)}</HelperNote>
    ) : null;
  }

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <StepperCard
        label="Groups"
        value={draft.poolCount}
        min={1}
        max={maxPoolCount(draft.teamCount)}
        step={1}
        onChange={(poolCount) => dispatch({ kind: "setPoolCount", poolCount })}
        decreaseLabel="Fewer groups"
        increaseLabel="More groups"
        notes={
          sizing
            ? [
                friendlyTournamentGroupsLine(sizing),
                ...(sizing.uneven ? [FRIENDLY_TOURNAMENT_UNEVEN_GROUPS] : []),
              ]
            : []
        }
        error={errors.poolCount}
      />
      {plan.groupsThenKnockout && qualifiersRange ? (
        <StepperCard
          label="Into knockout"
          value={draft.qualifiersPerPool}
          min={qualifiersRange.min}
          max={qualifiersRange.max}
          step={1}
          onChange={(qualifiersPerPool) =>
            dispatch({ kind: "setQualifiers", qualifiersPerPool })
          }
          decreaseLabel="Fewer teams into the knockout"
          increaseLabel="More teams into the knockout"
          notes={
            poolKnockoutTree
              ? [qualifiersConsequenceLine(poolKnockoutTree)]
              : []
          }
          error={errors.qualifiersPerPool}
        />
      ) : null}
    </View>
  );
}

function Rounds({ errors, dispatch, plan }: PlanProps) {
  const { sizing, rounds } = plan;
  if (!sizing || !rounds) {
    return null;
  }
  const range = roundCountRange(sizing.poolSizes);
  const suggested = rounds.roundCount === range.suggested;

  return (
    <StepSection
      title={ROUNDS_LABEL}
      note={suggested ? SUGGESTED_ROUNDS_TAG : undefined}
      link={
        suggested
          ? undefined
          : {
              label: suggestedRoundsResetLabel(range.suggested),
              onPress: () =>
                dispatch({ kind: "setRoundCount", roundCount: null }),
            }
      }
    >
      <StepperRow
        label={ROUNDS_LABEL}
        value={rounds.roundCount}
        unit={rounds.roundCount === 1 ? "Round" : "Rounds"}
        min={range.min}
        max={range.max}
        step={1}
        onChange={(next) =>
          dispatch({
            kind: "setRoundCount",
            roundCount: next === range.suggested ? null : next,
          })
        }
        decreaseLabel="Fewer Rounds"
        increaseLabel="More Rounds"
      />
      <HelperNote>
        {`${formatRoundMatchesPerTeam(rounds)}. ${ROUND_MEETS_COPY[rounds.meets]}.`}
      </HelperNote>
      <FieldError message={errors.roundCount} />
    </StepSection>
  );
}

function Finish({ state, now, errors, dispatch }: StepProps) {
  const { draft } = state;
  const slots = upcomingGameWindowTimeSlots(draft.day, now).filter(
    (slot) => slot > draft.startTime,
  );

  return (
    <StepSection title="Finish">
      <ChipGrid
        label="Finish time"
        columns={TIME_COLUMNS}
        chips={slots.map((slot) => ({
          value: slot,
          label: formatTimeSlotLabel(slot),
        }))}
        isSelected={(slot) => slot === draft.finishTime}
        onSelect={(slot) => dispatch({ kind: "setFinish", slot })}
      />
      <FieldError message={errors.windowEnd} />
    </StepSection>
  );
}

function GameLength({
  state,
  errors,
  dispatch,
  lastFinish,
}: StepProps & { lastFinish: string | null }) {
  const { draft } = state;
  const [customOpen, setCustomOpen] = useState(false);
  const minutes = parseCreateMatchMinutes(draft.matchMinutes);
  const chipValue = CREATE_FLOW_MATCH_MINUTE_CHIPS.find(
    (value) => minutes.ok && minutes.minutes === value,
  );
  const showCustom =
    customOpen || chipValue === undefined || Boolean(errors.matchMinutes);

  return (
    <StepSection title="Game length" note={lastFinish ?? undefined}>
      <ChipGrid
        label="Game length"
        columns={CREATE_FLOW_MATCH_MINUTE_CHIPS.length + 1}
        chips={CREATE_FLOW_MATCH_MINUTE_CHIPS.map((value) => ({
          value,
          label: `${value} min`,
        }))}
        isSelected={(value) => !showCustom && value === chipValue}
        onSelect={(value) => {
          setCustomOpen(false);
          dispatch({ kind: "setMatchMinutes", minutes: String(value) });
        }}
        escape={{
          label: "Set",
          selected: showCustom,
          accessibilityLabel: "Set a custom Game length",
          onPress: () => setCustomOpen(true),
        }}
      />
      {showCustom ? (
        <>
          <TextField
            label="Custom minutes"
            value={draft.matchMinutes}
            keyboardType="number-pad"
            onChangeText={(next) =>
              dispatch({ kind: "setMatchMinutes", minutes: next })
            }
            error={errors.matchMinutes}
          />
          <HelperNote>10 to 120 minutes, in steps of 5.</HelperNote>
        </>
      ) : null}
    </StepSection>
  );
}
