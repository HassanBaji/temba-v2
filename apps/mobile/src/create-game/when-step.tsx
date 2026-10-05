import {
  CREATE_FLOW_DURATIONS,
  CREATE_FLOW_MATCH_MINUTE_CHIPS,
  TOURNAMENT_SHAPE_OPTIONS,
  FRIENDLY_TOURNAMENT_UNEVEN_GROUPS,
  TOURNAMENT_FORMAT_LABEL,
  createDayChipLabel,
  createFlowDayOptions,
  dayChipValue,
  finishSlotForDuration,
  friendlyTournamentGroupsLine,
  matchingDurationPreset,
  parseCreateMatchMinutes,
  previewStartSlots,
} from "@repo/domain/create-game-flow";
import {
  friendlyTournamentPlan,
  friendlyTournamentScheduleFor,
} from "@repo/domain/create-game-submit";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  formatTimeSlotLabel,
  upcomingGameWindowTimeSlots,
} from "@repo/domain/game-window";
import {
  formatRoundMatchesPerTeam,
  ONE_DAY_OVERRUN_MESSAGE,
  poolCountOptions,
  ROUND_MEETS_COPY,
  roundCountRange,
  ROUNDS_LABEL,
  SUGGESTED_ROUNDS_TAG,
  suggestedRoundsResetLabel,
  resolveRoundCount,
} from "@repo/domain/tournament-sizing";
import {
  qualifierUnit,
  qualifiersConsequenceLine,
  THROUGH_FROM_EACH_GROUP_LABEL,
} from "@repo/domain/tournament-knockout";
import { sizeTournamentRounds } from "@repo/domain/tournament-schedule";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { ChipGrid, FieldError, Stepper } from "./chips";
import type { StepProps } from "./step-props";

const DAY_COUNT = 14;
const CUSTOM_FINISH = "custom";

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
      <Section title="Day">
        <ChipGrid
          label="Day"
          columns={4}
          chips={createFlowDayOptions(now, DAY_COUNT).map((option) => ({
            value: dayChipValue(option),
            label: createDayChipLabel(option, now),
          }))}
          isSelected={(day) => day === draft.day}
          onSelect={(day) => dispatch({ kind: "setDay", day, now })}
        />
        <FieldError message={dayError} />
      </Section>
      <Section title="Start time">
        <Text size="meta" tone="muted">
          30 minute steps
        </Text>
        <ChipGrid
          label="Start time"
          columns={4}
          chips={visibleStarts.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot),
          }))}
          isSelected={(slot) => slot === draft.startTime}
          onSelect={(slot) => dispatch({ kind: "setStart", slot })}
        />
        {!startExpanded && slots.length > visibleStarts.length ? (
          <Button
            label="More times"
            variant="outline"
            size="sm"
            onPress={() => setStartExpanded(true)}
          />
        ) : null}
        <FieldError message={startError} />
      </Section>
    </>
  );
}

function FinishTime({ state, now, errors, dispatch }: StepProps) {
  const { draft } = state;
  const [customOpen, setCustomOpen] = useState(false);
  const preset = matchingDurationPreset(draft.startTime, draft.finishTime);
  const showCustom =
    customOpen || (Boolean(draft.finishTime) && preset == null);
  const slots = upcomingGameWindowTimeSlots(draft.day, now).filter(
    (slot) => slot > draft.startTime,
  );
  const durations = CREATE_FLOW_DURATIONS.map((minutes) => ({
    value: String(minutes),
    label: `${minutes} min`,
    disabled:
      !draft.startTime ||
      finishSlotForDuration(draft.startTime, minutes) == null,
  }));
  const selected = showCustom
    ? CUSTOM_FINISH
    : preset != null
      ? String(preset)
      : "";

  return (
    <Section title="Finish">
      {draft.finishTime ? (
        <Text size="meta" tone="muted">
          {formatTimeSlotLabel(draft.finishTime)}
        </Text>
      ) : null}
      <ChipGrid
        label="Duration"
        chips={[...durations, { value: CUSTOM_FINISH, label: "Custom" }]}
        isSelected={(value) => value === selected}
        onSelect={(value) => {
          if (value === CUSTOM_FINISH) {
            setCustomOpen(true);
            return;
          }
          setCustomOpen(false);
          dispatch({ kind: "setDuration", minutes: Number(value) });
        }}
      />
      {showCustom ? (
        <ChipGrid
          label="Finish time"
          columns={4}
          chips={slots.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot),
          }))}
          isSelected={(slot) => slot === draft.finishTime}
          onSelect={(slot) => dispatch({ kind: "setFinish", slot })}
        />
      ) : null}
      <FieldError message={errors.windowEnd} />
    </Section>
  );
}

export function GameWhenStep(props: StepProps) {
  return (
    <View style={{ gap: 24 }}>
      <DayAndStart {...props} />
      <FinishTime {...props} />
    </View>
  );
}

export function TournamentWhenStep(props: StepProps) {
  const { state, now, errors, dispatch } = props;
  const { draft } = state;
  const plan = friendlyTournamentPlan(draft);
  const { sizing, knockoutOnly, groupsThenKnockout, qualifiersRange } = plan;
  const roundRange = sizing ? roundCountRange(sizing.poolSizes) : null;
  const resolvedRounds = sizing
    ? resolveRoundCount(sizing.poolSizes, draft.roundCount)
    : null;
  const rounds =
    sizing && resolvedRounds != null
      ? sizeTournamentRounds(sizing.poolSizes, resolvedRounds)
      : null;
  const poolOptions = poolCountOptions(draft.teamCount);
  const schedule = friendlyTournamentScheduleFor({
    plan,
    day: draft.day,
    startTime: draft.startTime,
    finishTime: draft.finishTime,
    matchMinutes: draft.matchMinutes,
    courtCount: draft.courtIds.length,
    now,
    clock: formatGameClock,
  });
  const slots = upcomingGameWindowTimeSlots(draft.day, now).filter(
    (slot) => slot > draft.startTime,
  );
  const minutes = parseCreateMatchMinutes(draft.matchMinutes);

  return (
    <View style={{ gap: 24 }}>
      <Section title={TOURNAMENT_FORMAT_LABEL}>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {TOURNAMENT_SHAPE_OPTIONS.map((option) => {
            const selected = draft.tournamentShape === option.id;
            return (
              <Button
                key={option.id}
                label={`${option.title}. ${option.description}`}
                variant={selected ? "default" : "outline"}
                selected={selected}
                onPress={() => dispatch({ kind: "setShape", shape: option.id })}
              />
            );
          })}
        </View>
      </Section>

      {knockoutOnly ? null : (
        <Section title="Groups">
          <ChipGrid
            label="Groups"
            chips={poolOptions.map((count) => ({
              value: count,
              label: String(count),
            }))}
            isSelected={(count) => count === draft.poolCount}
            onSelect={(poolCount) =>
              dispatch({ kind: "setPoolCount", poolCount })
            }
          />
          {sizing ? (
            <>
              <Text size="meta" tone="muted">
                {friendlyTournamentGroupsLine(sizing)}
              </Text>
              {sizing.uneven ? (
                <Text size="meta" tone="muted">
                  {FRIENDLY_TOURNAMENT_UNEVEN_GROUPS}
                </Text>
              ) : null}
            </>
          ) : null}
          <FieldError message={errors.poolCount} />
        </Section>
      )}

      {sizing && roundRange && resolvedRounds != null && rounds ? (
        <Stepper
          label={ROUNDS_LABEL}
          value={resolvedRounds}
          unit={resolvedRounds === 1 ? "Round" : "Rounds"}
          min={roundRange.min}
          max={roundRange.max}
          step={1}
          onChange={(next) =>
            dispatch({
              kind: "setRoundCount",
              roundCount: next === roundRange.suggested ? null : next,
            })
          }
          decreaseLabel="Fewer Rounds"
          increaseLabel="More Rounds"
          hint={`${formatRoundMatchesPerTeam(rounds)} ${ROUND_MEETS_COPY[rounds.meets]}`}
          error={errors.roundCount}
        />
      ) : null}
      {sizing && roundRange && resolvedRounds != null ? (
        resolvedRounds === roundRange.suggested ? (
          <Text size="meta" tone="muted">
            {SUGGESTED_ROUNDS_TAG}
          </Text>
        ) : (
          <Button
            label={suggestedRoundsResetLabel(roundRange.suggested)}
            variant="outline"
            size="sm"
            onPress={() =>
              dispatch({ kind: "setRoundCount", roundCount: null })
            }
          />
        )
      ) : null}

      {groupsThenKnockout && qualifiersRange ? (
        <Stepper
          label={THROUGH_FROM_EACH_GROUP_LABEL}
          value={draft.qualifiersPerPool}
          unit={qualifierUnit(draft.qualifiersPerPool)}
          min={qualifiersRange.min}
          max={qualifiersRange.max}
          step={1}
          onChange={(qualifiersPerPool) =>
            dispatch({ kind: "setQualifiers", qualifiersPerPool })
          }
          decreaseLabel="Fewer teams through"
          increaseLabel="More teams through"
          hint={
            plan.poolKnockoutTree
              ? qualifiersConsequenceLine(plan.poolKnockoutTree)
              : undefined
          }
          error={errors.qualifiersPerPool}
        />
      ) : null}

      <DayAndStart {...props} />
      <Section title="Finish">
        <ChipGrid
          label="Finish time"
          columns={4}
          chips={slots.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot),
          }))}
          isSelected={(slot) => slot === draft.finishTime}
          onSelect={(slot) => dispatch({ kind: "setFinish", slot })}
        />
        <FieldError message={errors.windowEnd} />
      </Section>

      <Section title="Game length">
        <ChipGrid
          label="Game length"
          chips={CREATE_FLOW_MATCH_MINUTE_CHIPS.map((value) => ({
            value,
            label: `${value} min`,
          }))}
          isSelected={(value) => minutes.ok && minutes.minutes === value}
          onSelect={(value) =>
            dispatch({ kind: "setMatchMinutes", minutes: String(value) })
          }
        />
        <TextField
          label="Custom minutes"
          value={draft.matchMinutes}
          keyboardType="number-pad"
          onChangeText={(next) =>
            dispatch({ kind: "setMatchMinutes", minutes: next })
          }
          error={errors.matchMinutes}
        />
        <Text size="meta" tone="muted">
          10 to 120 minutes, in steps of 5.
        </Text>
      </Section>

      {schedule ? (
        <Surface style={{ gap: 8 }}>
          {schedule.line ? <Text size="lead">{schedule.line}</Text> : null}
          {schedule.overruns ? (
            <Text size="meta" tone="muted">
              {ONE_DAY_OVERRUN_MESSAGE}
            </Text>
          ) : null}
        </Surface>
      ) : null}
    </View>
  );
}
