import {
  isPublicGameDraft,
  type CreateGroupOption,
  type CreateVenuePicker,
} from "@repo/domain/create-game-flow";
import { friendlyTournamentPlan } from "@repo/domain/create-game-submit";
import type { Locale } from "@repo/i18n/locale";
import { View } from "react-native";

import type { Slot } from "../home/home-model";
import { FormErrorSummary } from "../auth/form-error-summary";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  createEntryHeader,
  friendlyGameTimeHeader,
  stepHeader,
  tournamentEntryHeader,
  tournamentFormatHeader,
  type StepHeaderText,
} from "./create-header";
import type { CreateAction, CreateState, FieldErrors } from "./create-model";
import { tournamentMatchTotals } from "./create-summary";
import {
  FootballDetailsStep,
  GameDetailsStep,
  TournamentDetailsStep,
} from "./details-step";
import { StepFooter, StepShell } from "./step-shell";
import { TypeStep } from "./type-step";
import { GameWhenStep, TournamentWhenStep } from "./when-step";
import { groupLabel } from "./group-field";
import { WhereStep } from "./where-step";

export type CreateViewProps = {
  state: CreateState;
  now: Date;
  errors: FieldErrors;
  formMessage: string | null;
  groups: Slot<CreateGroupOption[]>;
  picker: Slot<CreateVenuePicker> | null;
  pending: boolean;
  dispatch: (action: CreateAction) => void;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
  onRetry: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  initialVenueSheetQuery?: string;
  children?: React.ReactNode;
};

function laterStepHeader({
  state,
  groupName,
  venueName,
  courtNames,
  locale,
}: {
  state: CreateState;
  groupName: string | null;
  venueName: string | null;
  courtNames: string[];
  locale: Locale;
}): StepHeaderText {
  const { draft, type } = state;
  if (type !== "friendly_tournament") {
    return friendlyGameTimeHeader({
      day: draft.day,
      startTime: draft.startTime,
      finishTime: draft.finishTime,
      groupName,
      venueName,
      courtName: courtNames[0] ?? null,
      locale,
    });
  }
  if (state.step === 3) {
    return tournamentFormatHeader({
      teamCount: draft.teamCount,
      matchTotal: tournamentMatchTotals(friendlyTournamentPlan(draft)).total,
      day: draft.day,
      venueName,
      courtCount: draft.courtIds.length,
      locale,
    });
  }
  return tournamentEntryHeader({
    teamCount: draft.teamCount,
    matchTotal: tournamentMatchTotals(friendlyTournamentPlan(draft)).total,
    day: draft.day,
    startTime: draft.startTime,
    finishTime: draft.finishTime,
    courtCount: draft.courtIds.length,
    locale,
  });
}

export function CreateView(props: CreateViewProps) {
  const { state, groups, picker } = props;
  const { draft } = state;
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame;
  const shell = {
    refreshing: props.refreshing,
    onRefresh: props.onRefresh,
  };
  const publicGame = isPublicGameDraft(draft);

  if (groups.status !== "ready" || (groups.value.length === 0 && !publicGame)) {
    return (
      <StepShell step={null} header={createEntryHeader(locale)} {...shell}>
        {props.children}
        {groups.status === "loading" ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        ) : groups.status === "error" ? (
          <Surface accessibilityRole="alert" style={{ gap: 8 }}>
            <Text size="lead" weight="semibold">
              {copy.group.loadFailedTitle}
            </Text>
            <Text size="meta" tone="muted">
              {groups.message}
            </Text>
            <Button
              label={m.common.tryAgain}
              variant="outline"
              onPress={props.onRetry}
            />
          </Surface>
        ) : (
          <Surface style={{ gap: 8 }}>
            <Text size="lead" weight="semibold">
              {copy.group.noneTitle}
            </Text>
            <Text size="meta" tone="muted">
              {copy.group.noneBody}
            </Text>
            <Button
              label={m.rating.publicGame.createAction}
              onPress={() => {
                props.dispatch({ kind: "selectType", type: "friendly_game" });
                props.dispatch({ kind: "choosePublic" });
                props.dispatch({ kind: "setStep", step: 2 });
              }}
            />
            <Button
              label={m.common.back}
              variant="outline"
              onPress={props.onCancel}
            />
          </Surface>
        )}
      </StepShell>
    );
  }

  const selectedGroup = groups.value.find(
    (group) => group.id === draft.groupId,
  );
  const groupName = selectedGroup
    ? groupLabel(selectedGroup, locale)
    : publicGame
      ? m.rating.publicGame.label
      : null;
  const groupVerified = selectedGroup?.verified ?? false;
  const pickerData = picker?.status === "ready" ? picker.value : null;
  const venue = pickerData?.venues.find((item) => item.id === draft.venueId);
  const courtNames =
    state.type === "friendly_tournament"
      ? (venue?.courts
          .filter((item) => draft.courtIds.includes(item.id))
          .map((item) => item.name) ?? [])
      : draft.courtId !== "none"
        ? (venue?.courts
            .filter((item) => item.id === draft.courtId)
            .map((item) => item.name) ?? [])
        : [];
  const step = {
    state,
    now: props.now,
    errors: props.errors,
    dispatch: props.dispatch,
  };
  const emptyCatalog =
    state.step === 2 &&
    pickerData !== null &&
    !pickerData.locked &&
    pickerData.venues.length === 0;
  const summary =
    props.formMessage ??
    (emptyCatalog
      ? publicGame
        ? state.sport === "football"
          ? m.rating.publicGame.noPartnerPitches
          : m.rating.publicGame.noPartnerVenues
        : copy.venue.noneLive
      : null) ??
    (picker?.status === "error" ? picker.message : null);
  const header =
    stepHeader(
      state,
      {
        groupName,
        venues: pickerData
          ? { locked: pickerData.locked, count: pickerData.venues.length }
          : null,
      },
      locale,
    ) ??
    laterStepHeader({
      state,
      groupName,
      venueName: venue?.name ?? null,
      courtNames,
      locale,
    });

  return (
    <StepShell
      step={state.step}
      header={header}
      onBack={props.onBack}
      footer={
        <StepFooter
          state={state}
          pending={props.pending}
          onContinue={props.onContinue}
          onCancel={props.onCancel}
        />
      }
      {...shell}
    >
      {props.children}
      <FormErrorSummary message={summary} />
      {state.step === 1 ? <TypeStep {...step} /> : null}
      {state.step === 2 ? (
        <WhereStep
          {...step}
          groups={groups.value}
          picker={picker}
          initialVenueSheetQuery={props.initialVenueSheetQuery}
        />
      ) : null}
      {state.step === 3 ? (
        state.type === "friendly_tournament" ? (
          <TournamentWhenStep {...step} />
        ) : (
          <GameWhenStep {...step} />
        )
      ) : null}
      {state.step === 4 ? (
        state.type === "friendly_tournament" ? (
          <TournamentDetailsStep
            {...step}
            groupName={groupName}
            groupVerified={groupVerified}
            picker={pickerData}
          />
        ) : state.sport === "football" ? (
          <FootballDetailsStep
            {...step}
            groupName={groupName}
            groupVerified={groupVerified}
            picker={pickerData}
          />
        ) : (
          <GameDetailsStep
            {...step}
            groupName={groupName}
            groupVerified={groupVerified}
            picker={pickerData}
          />
        )
      ) : null}
    </StepShell>
  );
}
