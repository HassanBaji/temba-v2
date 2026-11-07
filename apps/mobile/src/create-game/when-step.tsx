import { spacing } from "@repo/design-tokens";
import {
  CREATE_FLOW_DURATIONS,
  CREATE_FLOW_MATCH_MINUTE_CHIPS,
  finishSlotForDuration,
  friendlyTournamentGroupsLine,
  matchingDurationPreset,
  parseCreateMatchMinutes,
  previewStartSlots,
  tournamentShapeOptions,
} from "@repo/domain/create-game-flow";
import {
  friendlyTournamentPlan,
  type FriendlyTournamentPlan,
} from "@repo/domain/create-game-submit";
import {
  formatTimeSlotLabel,
  upcomingGameWindowFinishSlots,
  upcomingGameWindowTimeSlots,
} from "@repo/domain/game-window";
import {
  knockoutOnlyReviewValue,
  qualifiersConsequenceLine,
} from "@repo/domain/tournament-knockout";
import {
  formatRoundMatchesPerTeam,
  maxPoolCount,
  roundCountRange,
  roundMeetsCopy,
  suggestedRoundsResetLabel,
} from "@repo/domain/tournament-sizing";
import { useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.when;
  const pickDay = m.createGame.validation.pickDay;
  const [startExpanded, setStartExpanded] = useState(false);
  const slots = upcomingGameWindowTimeSlots(draft.day, now);
  const visibleStarts = previewStartSlots(
    slots,
    draft.startTime,
    startExpanded,
  );
  const startError =
    errors.windowStart && errors.windowStart !== pickDay
      ? errors.windowStart
      : undefined;
  const dayError = errors.windowStart === pickDay ? pickDay : undefined;

  return (
    <>
      <DayField
        now={now}
        day={draft.day}
        error={dayError}
        onSelect={(day) => dispatch({ kind: "setDay", day, now })}
      />
      <StepSection title={copy.startTime}>
        <ChipGrid
          label={copy.startTime}
          columns={TIME_COLUMNS}
          chips={visibleStarts.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot, locale),
          }))}
          isSelected={(slot) => slot === draft.startTime}
          onSelect={(slot) => dispatch({ kind: "setStart", slot })}
          escape={
            slots.length > visibleStarts.length
              ? {
                  label: m.common.more,
                  accessibilityLabel: copy.moreStartTimes,
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
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.when;
  const [customOpen, setCustomOpen] = useState(false);
  const preset = matchingDurationPreset(draft.startTime, draft.finishTime);
  const showCustom =
    customOpen || (Boolean(draft.finishTime) && preset == null);
  const slots = upcomingGameWindowFinishSlots(draft.day, draft.startTime, now);
  const durations = CREATE_FLOW_DURATIONS.map((minutes) => ({
    value: minutes,
    label: m.dates.minutes(minutes),
    disabled:
      !draft.startTime ||
      finishSlotForDuration(draft.startTime, minutes) == null,
  }));

  return (
    <StepSection
      title={copy.duration}
      note={
        draft.finishTime
          ? copy.endsAt(formatTimeSlotLabel(draft.finishTime, locale))
          : undefined
      }
    >
      <ChipGrid
        label={copy.duration}
        columns={CREATE_FLOW_DURATIONS.length + 1}
        chips={durations}
        isSelected={(minutes) => !showCustom && minutes === preset}
        onSelect={(minutes) => {
          setCustomOpen(false);
          dispatch({ kind: "setDuration", minutes });
        }}
        escape={{
          label: copy.otherDuration,
          selected: showCustom,
          accessibilityLabel: copy.setFinishTime,
          onPress: () => setCustomOpen(true),
        }}
      />
      {showCustom ? (
        <ChipGrid
          label={copy.finishTime}
          columns={TIME_COLUMNS}
          chips={slots.map((slot) => ({
            value: slot,
            label: formatTimeSlotLabel(slot, locale),
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
  const copy = useMessages().mobileCreateGame.when;
  return (
    <View style={{ gap: spacing.section }}>
      <DayAndStart {...props} />
      <Duration {...props} />
      <View style={{ gap: 14 }}>
        <Hairline />
        <HelperNote>{copy.helper}</HelperNote>
      </View>
    </View>
  );
}

export function TournamentWhenStep(props: StepProps) {
  const { state, now, dispatch } = props;
  const { draft } = state;
  const locale = useLocale();
  const m = useMessages();
  const plan = friendlyTournamentPlan(draft);
  const summary = tournamentScheduleSummary({
    plan,
    day: draft.day,
    startTime: draft.startTime,
    finishTime: draft.finishTime,
    matchMinutes: draft.matchMinutes,
    courtCount: draft.courtIds.length,
    now,
    locale,
  });

  return (
    <View style={{ gap: spacing.section }}>
      <StepSection
        title={m.createGame.tournamentFormat}
        note={m.common.required}
      >
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {tournamentShapeOptions(locale).map((option) => (
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
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.when;

  if (plan.knockoutOnly) {
    return knockoutTree ? (
      <HelperNote>{knockoutOnlyReviewValue(knockoutTree, locale)}</HelperNote>
    ) : null;
  }

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <StepperCard
        label={copy.groups}
        value={draft.poolCount}
        min={1}
        max={maxPoolCount(draft.teamCount)}
        step={1}
        onChange={(poolCount) => dispatch({ kind: "setPoolCount", poolCount })}
        decreaseLabel={copy.fewerGroups}
        increaseLabel={copy.moreGroups}
        notes={
          sizing
            ? [
                friendlyTournamentGroupsLine(sizing, locale),
                ...(sizing.uneven ? [m.createGame.unevenGroups] : []),
              ]
            : []
        }
        error={errors.poolCount}
      />
      {plan.groupsThenKnockout && qualifiersRange ? (
        <StepperCard
          label={copy.intoKnockout}
          value={draft.qualifiersPerPool}
          min={qualifiersRange.min}
          max={qualifiersRange.max}
          step={1}
          onChange={(qualifiersPerPool) =>
            dispatch({ kind: "setQualifiers", qualifiersPerPool })
          }
          decreaseLabel={copy.fewerIntoKnockout}
          increaseLabel={copy.moreIntoKnockout}
          notes={
            poolKnockoutTree
              ? [qualifiersConsequenceLine(poolKnockoutTree, locale)]
              : []
          }
          error={errors.qualifiersPerPool}
        />
      ) : null}
    </View>
  );
}

function Rounds({ errors, dispatch, plan }: PlanProps) {
  const locale = useLocale();
  const m = useMessages();
  const { sizing, rounds } = plan;
  if (!sizing || !rounds) {
    return null;
  }
  const range = roundCountRange(sizing.poolSizes);
  const suggested = rounds.roundCount === range.suggested;
  const sizingCopy = m.tournament.sizing;
  const copy = m.mobileCreateGame.when;

  return (
    <StepSection
      title={sizingCopy.roundsLabel}
      note={suggested ? sizingCopy.suggestedTag : undefined}
      link={
        suggested
          ? undefined
          : {
              label: suggestedRoundsResetLabel(range.suggested, locale),
              onPress: () =>
                dispatch({ kind: "setRoundCount", roundCount: null }),
            }
      }
    >
      <StepperRow
        label={sizingCopy.roundsLabel}
        value={rounds.roundCount}
        unit={copy.roundUnit(rounds.roundCount)}
        min={range.min}
        max={range.max}
        step={1}
        onChange={(next) =>
          dispatch({
            kind: "setRoundCount",
            roundCount: next === range.suggested ? null : next,
          })
        }
        decreaseLabel={copy.fewerRounds}
        increaseLabel={copy.moreRounds}
      />
      <HelperNote>
        {copy.roundsHelper(
          formatRoundMatchesPerTeam(rounds, locale),
          roundMeetsCopy(rounds.meets, locale),
        )}
      </HelperNote>
      <FieldError message={errors.roundCount} />
    </StepSection>
  );
}

function Finish({ state, now, errors, dispatch }: StepProps) {
  const { draft } = state;
  const slots = upcomingGameWindowFinishSlots(draft.day, draft.startTime, now);
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.when;

  return (
    <StepSection title={copy.finish}>
      <ChipGrid
        label={copy.finishTime}
        columns={TIME_COLUMNS}
        chips={slots.map((slot) => ({
          value: slot,
          label: formatTimeSlotLabel(slot, locale),
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
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.when;
  const [customOpen, setCustomOpen] = useState(false);
  const minutes = parseCreateMatchMinutes(draft.matchMinutes, locale);
  const chipValue = CREATE_FLOW_MATCH_MINUTE_CHIPS.find(
    (value) => minutes.ok && minutes.minutes === value,
  );
  const showCustom =
    customOpen || chipValue === undefined || Boolean(errors.matchMinutes);

  return (
    <StepSection title={copy.gameLength} note={lastFinish ?? undefined}>
      <ChipGrid
        label={copy.gameLength}
        columns={CREATE_FLOW_MATCH_MINUTE_CHIPS.length + 1}
        chips={CREATE_FLOW_MATCH_MINUTE_CHIPS.map((value) => ({
          value,
          label: m.dates.minutes(value),
        }))}
        isSelected={(value) => !showCustom && value === chipValue}
        onSelect={(value) => {
          setCustomOpen(false);
          dispatch({ kind: "setMatchMinutes", minutes: String(value) });
        }}
        escape={{
          label: copy.set,
          selected: showCustom,
          accessibilityLabel: copy.setCustomLength,
          onPress: () => setCustomOpen(true),
        }}
      />
      {showCustom ? (
        <>
          <TextField
            label={copy.customMinutes}
            value={draft.matchMinutes}
            keyboardType="number-pad"
            onChangeText={(next) =>
              dispatch({ kind: "setMatchMinutes", minutes: next })
            }
            error={errors.matchMinutes}
          />
          <HelperNote>{copy.customMinutesHint}</HelperNote>
        </>
      ) : null}
    </StepSection>
  );
}
