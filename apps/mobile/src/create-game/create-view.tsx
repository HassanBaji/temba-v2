import {
  createFlowLaterSteps,
  friendlyGameKickoff,
  friendlyGamePreviewLine,
  friendlyTournamentDefaultName,
  friendlyTournamentPreviewDetail,
  type CreateGroupOption,
  type CreateVenuePicker,
} from "@repo/domain/create-game-flow";
import { View } from "react-native";

import type { Slot } from "../home/home-model";
import { FormErrorSummary } from "../auth/form-error-summary";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  CREATE_ENTRY_HEADER,
  stepHeader,
  type StepHeaderText,
} from "./create-header";
import type { CreateAction, CreateState, FieldErrors } from "./create-model";
import { GameDetailsStep, TournamentDetailsStep } from "./details-step";
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
  children?: React.ReactNode;
};

function laterStepHeader({
  state,
  groupName,
  venueName,
  courtNames,
}: {
  state: CreateState;
  groupName: string | null;
  venueName: string | null;
  courtNames: string[];
}): StepHeaderText {
  const { draft, type } = state;
  const kickoff =
    type === "friendly_game"
      ? friendlyGameKickoff(draft.day, draft.startTime, draft.finishTime)
      : null;
  const title =
    type === "friendly_tournament"
      ? draft.name.trim() || friendlyTournamentDefaultName(draft.day)
      : (kickoff?.time ?? "New Game");
  const detail =
    type === "friendly_tournament"
      ? friendlyTournamentPreviewDetail({
          day: draft.day,
          venueName,
          courtNames,
        })
      : friendlyGamePreviewLine({
          day: draft.startTime ? draft.day : "",
          groupName,
          venueName,
          courtName: courtNames[0] ?? null,
        });
  return { title: [title], subtitle: detail || null, context: null };
}

export function CreateView(props: CreateViewProps) {
  const { state, groups, picker } = props;
  const { draft } = state;
  const shell = {
    refreshing: props.refreshing,
    onRefresh: props.onRefresh,
  };

  if (groups.status !== "ready" || groups.value.length === 0) {
    return (
      <StepShell step={null} header={CREATE_ENTRY_HEADER} {...shell}>
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
              Groups could not be loaded
            </Text>
            <Text size="meta" tone="muted">
              {groups.message}
            </Text>
            <Button
              label="Try again"
              variant="outline"
              onPress={props.onRetry}
            />
          </Surface>
        ) : (
          <Surface style={{ gap: 8 }}>
            <Text size="lead" weight="semibold">
              No Group to create in
            </Text>
            <Text size="meta" tone="muted">
              You can create a Game in a Group you organize. Create or join a
              Group first.
            </Text>
            <Button label="Back" variant="outline" onPress={props.onCancel} />
          </Surface>
        )}
      </StepShell>
    );
  }

  const selectedGroup = groups.value.find(
    (group) => group.id === draft.groupId,
  );
  const groupName = selectedGroup ? groupLabel(selectedGroup) : null;
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
    (emptyCatalog ? "No live Venues. Create is not available." : null) ??
    (picker?.status === "error" ? picker.message : null);
  const header =
    stepHeader(state, {
      groupName,
      venues: pickerData
        ? { locked: pickerData.locked, count: pickerData.venues.length }
        : null,
    }) ??
    laterStepHeader({
      state,
      groupName,
      venueName: venue?.name ?? null,
      courtNames,
    });
  const upcoming =
    state.step <= 2
      ? createFlowLaterSteps(state.type).filter(
          (item) => item.step > state.step,
        )
      : [];

  return (
    <StepShell
      step={state.step}
      header={header}
      onBack={props.onBack}
      upcoming={upcoming}
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
        <WhereStep {...step} groups={groups.value} picker={picker} />
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
            picker={pickerData}
          />
        ) : (
          <GameDetailsStep
            {...step}
            groupName={groupName}
            picker={pickerData}
          />
        )
      ) : null}
    </StepShell>
  );
}
