import { colors, radii } from "@repo/design-tokens";
import {
  CREATE_FLOW_STEP_COUNT,
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
import { GameDetailsStep, TournamentDetailsStep } from "./details-step";
import type { CreateAction, CreateState, FieldErrors } from "./create-model";
import { TypeStep } from "./type-step";
import { GameWhenStep, TournamentWhenStep } from "./when-step";
import { groupLabel, WhereStep } from "./where-step";

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
};

function Progress({ step }: { step: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 6 }}
    >
      {Array.from({ length: CREATE_FLOW_STEP_COUNT }, (_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: 3,
            borderRadius: radii.sm,
            backgroundColor: index < step ? colors.paper : colors.dimrule,
          }}
        />
      ))}
    </View>
  );
}

function Header({
  state,
  groupName,
  venueName,
  courtNames,
}: {
  state: CreateState;
  groupName: string | null;
  venueName: string | null;
  courtNames: string[];
}) {
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
  const stepTitle =
    state.step === 1
      ? "Game type"
      : (createFlowLaterSteps(type).find((item) => item.step === state.step)
          ?.title ?? "");

  return (
    <Surface tone="ink" style={{ gap: 12 }}>
      <Text size="meta" uppercase mono accessibilityRole="header">
        {`Step ${state.step} of ${CREATE_FLOW_STEP_COUNT} · ${stepTitle}`}
      </Text>
      <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
        <Text size="title" weight="semibold">
          {title}
        </Text>
        {detail ? <Text size="meta">{detail}</Text> : null}
      </View>
      <Progress step={state.step} />
    </Surface>
  );
}

export function CreateView(props: CreateViewProps) {
  const { state, groups, picker } = props;
  const { draft } = state;

  if (groups.status === "loading") {
    return (
      <View style={{ gap: 12 }}>
        <Skeleton height={120} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    );
  }
  if (groups.status === "error") {
    return (
      <Surface accessibilityRole="alert" style={{ gap: 8 }}>
        <Text size="lead" weight="semibold">
          Groups could not be loaded
        </Text>
        <Text size="meta" tone="muted">
          {groups.message}
        </Text>
        <Button label="Try again" variant="outline" onPress={props.onRetry} />
      </Surface>
    );
  }
  if (groups.value.length === 0) {
    return (
      <Surface style={{ gap: 8 }}>
        <Text size="lead" weight="semibold">
          No Group to create in
        </Text>
        <Text size="meta" tone="muted">
          You can create a Game in a Group you organize. Create or join a Group
          first.
        </Text>
        <Button label="Back" variant="outline" onPress={props.onCancel} />
      </Surface>
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
  const last = state.step === CREATE_FLOW_STEP_COUNT;
  const emptyCatalog =
    state.step === 2 &&
    pickerData !== null &&
    !pickerData.locked &&
    pickerData.venues.length === 0;
  const summary =
    props.formMessage ??
    (emptyCatalog ? "No live Venues. Create is not available." : null) ??
    (picker?.status === "error" ? picker.message : null);

  return (
    <View style={{ gap: 24 }}>
      <Header
        state={state}
        groupName={groupName}
        venueName={venue?.name ?? null}
        courtNames={courtNames}
      />
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
      <View style={{ gap: 8 }}>
        <Button
          label={
            last
              ? props.pending
                ? "Creating…"
                : state.type === "friendly_tournament"
                  ? "Create tournament"
                  : "Create Game"
              : "Continue"
          }
          size="lg"
          pending={props.pending}
          onPress={props.onContinue}
        />
        {state.step > 1 ? (
          <Button
            label="Back"
            variant="outline"
            size="lg"
            disabled={props.pending}
            onPress={props.onBack}
          />
        ) : null}
        <Button
          label="Cancel"
          variant="outline"
          size="lg"
          disabled={props.pending}
          onPress={props.onCancel}
        />
      </View>
    </View>
  );
}
