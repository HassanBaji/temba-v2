"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { displayLabelFromStoredBand } from "~/lib/level-bands";
import {
  MERGE_DISMISS_ACTION_LABEL,
  MERGE_OPEN_POSITION_SR,
  MERGE_PREVIEW_LABEL,
  MERGE_PRIMARY_ACTION_LABEL,
  MERGE_SAME_POSITION_COPY,
  MERGE_SWAP_LABEL,
  MERGE_TAKES_EFFECT_COPY,
  defaultMergePositions,
  halfTeamsFromSides,
  mergeOccupantSubline,
  mergeOpenPositionLabel,
  mergeSwapHint,
  mergeTeamEyebrow,
  samePositionMerge,
  swapMergePositions,
  type HalfTeam,
  type MergePositionAssignment,
} from "~/lib/tournament-half-teams";
import { LEFT_SEAT_LABEL, RIGHT_SEAT_LABEL } from "~/lib/tournament-home";

type Side = {
  sideIndex: number;
  gameTeamId: string | null;
  left: {
    userId: string;
    name: string;
    image: string | null;
    levelBand?: HalfTeam["occupant"]["levelBand"];
  } | null;
  right: {
    userId: string;
    name: string;
    image: string | null;
    levelBand?: HalfTeam["occupant"]["levelBand"];
  } | null;
};

function halfTeamById(halfTeams: HalfTeam[], gameTeamId: string | null) {
  if (!gameTeamId) {
    return null;
  }
  return halfTeams.find((team) => team.gameTeamId === gameTeamId) ?? null;
}

function assignmentFor(
  first: HalfTeam | null,
  swapped: boolean,
): MergePositionAssignment | null {
  if (!first) {
    return null;
  }
  const defaults = defaultMergePositions(first);
  return swapped ? swapMergePositions(defaults) : defaults;
}

function occupantLevelLabel(team: HalfTeam) {
  const band = team.occupant.levelBand;
  return band ? displayLabelFromStoredBand(band) : null;
}

export function TournamentHalfTeamsPanel({
  sides,
  mergePending,
  mergeError,
  onMerge,
  onDismiss,
}: {
  sides: Side[];
  mergePending: boolean;
  mergeError: { message: string; data?: { zodError?: unknown } | null } | null;
  onMerge: (input: {
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: "left" | "right";
    secondPosition: "left" | "right";
  }) => void | Promise<void>;
  onDismiss: () => void;
}) {
  const halfTeams = halfTeamsFromSides(sides);
  const [firstId, setFirstId] = React.useState("");
  const [secondId, setSecondId] = React.useState("");
  const [swapped, setSwapped] = React.useState(false);

  const first =
    halfTeamById(halfTeams, firstId) ??
    (halfTeams.length >= 1 ? (halfTeams[0] ?? null) : null);
  const selectedSecond = halfTeamById(halfTeams, secondId);
  const second =
    selectedSecond && selectedSecond.gameTeamId !== first?.gameTeamId
      ? selectedSecond
      : (halfTeams.find((team) => team.gameTeamId !== first?.gameTeamId) ??
        null);
  const assignment = assignmentFor(first, swapped);
  const invalidPair = assignment ? samePositionMerge(assignment) : false;
  const canMerge = Boolean(first && second && assignment && !invalidPair);

  async function confirmMerge() {
    if (!first || !second || !assignment || mergePending || invalidPair) {
      return;
    }
    try {
      await onMerge({
        firstGameTeamId: first.gameTeamId,
        secondGameTeamId: second.gameTeamId,
        firstPosition: assignment.firstPosition,
        secondPosition: assignment.secondPosition,
      });
      setSwapped(false);
      onDismiss();
    } catch {
      return;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto overscroll-contain px-[22px] py-[22px]">
        {halfTeams.length > 2 && first && second ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="first-half-team">First Half team</FieldLabel>
              <Select
                value={first.gameTeamId}
                onValueChange={(value) => {
                  setFirstId(value);
                  setSwapped(false);
                  if (value === second.gameTeamId) {
                    setSecondId("");
                  }
                }}
              >
                <SelectTrigger id="first-half-team" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {halfTeams.map((team) => (
                    <SelectItem key={team.gameTeamId} value={team.gameTeamId}>
                      {team.occupant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="second-half-team">
                Second Half team
              </FieldLabel>
              <Select
                value={second.gameTeamId}
                onValueChange={(value) => {
                  setSecondId(value);
                  setSwapped(false);
                }}
              >
                <SelectTrigger
                  id="second-half-team"
                  className="min-h-11 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {halfTeams
                    .filter((team) => team.gameTeamId !== first.gameTeamId)
                    .map((team) => (
                      <SelectItem key={team.gameTeamId} value={team.gameTeamId}>
                        {team.occupant.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}

        {first && second ? (
          <div className="flex items-center gap-2.5">
            <HalfTeamCard team={first} />
            <span
              aria-hidden="true"
              className="text-muted-foreground flex w-[26px] shrink-0 items-center justify-center"
            >
              <Plus className="size-[18px]" strokeWidth={2} />
            </span>
            <HalfTeamCard team={second} />
          </div>
        ) : null}

        {first && second && assignment ? (
          <MergedPreview
            first={first}
            second={second}
            assignment={assignment}
            mergePending={mergePending}
            onSwap={() => setSwapped((value) => !value)}
          />
        ) : null}

        <FormErrorSummary
          message={
            invalidPair
              ? MERGE_SAME_POSITION_COPY
              : globalFormErrorMessage(mergeError)
          }
        />
      </div>

      <div className="border-rule mt-auto flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          className="h-[52px] min-h-[52px] w-full rounded-[12px] text-base font-semibold"
          disabled={mergePending || !canMerge}
          aria-busy={mergePending}
          onClick={() => {
            void confirmMerge();
          }}
        >
          {mergePending ? "Merging…" : MERGE_PRIMARY_ACTION_LABEL}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-[52px] min-h-[52px] w-full rounded-[12px] text-[15px]"
          disabled={mergePending}
          onClick={() => {
            setSwapped(false);
            onDismiss();
          }}
        >
          {MERGE_DISMISS_ACTION_LABEL}
        </Button>
        <p className="text-muted-foreground text-center text-[13px] leading-relaxed">
          {MERGE_TAKES_EFFECT_COPY}
        </p>
      </div>
    </div>
  );
}

function HalfTeamCard({ team }: { team: HalfTeam }) {
  const levelLabel = occupantLevelLabel(team);
  const openLabel = mergeOpenPositionLabel(team.openPosition);

  return (
    <div className="border-rule min-w-0 flex-1 rounded-[14px] border p-4">
      <p className="text-eyebrow text-muted-foreground tabular-nums">
        {mergeTeamEyebrow(team.sideIndex)}
      </p>
      <div className="mt-3 flex items-center gap-2.5">
        <UserAvatar
          name={team.occupant.name}
          image={team.occupant.image}
          className="border-rule size-[34px] shrink-0 rounded-[8px] border"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px]">{team.occupant.name}</span>
          <span className="text-muted-foreground text-xs">
            {mergeOccupantSubline(team.takenPosition, levelLabel)}
          </span>
        </span>
      </div>
      <div className="border-rule relative mt-2 flex h-[52px] min-h-[52px] items-center justify-center overflow-hidden rounded-[10px] border">
        <span aria-hidden="true" className="hatch absolute inset-0" />
        <span className="sr-only">{MERGE_OPEN_POSITION_SR}</span>
        <span
          aria-hidden="true"
          className="text-muted-foreground relative text-xs"
        >
          {openLabel}
        </span>
      </div>
    </div>
  );
}

function MergedPreview({
  first,
  second,
  assignment,
  mergePending,
  onSwap,
}: {
  first: HalfTeam;
  second: HalfTeam;
  assignment: MergePositionAssignment;
  mergePending: boolean;
  onSwap: () => void;
}) {
  const left =
    assignment.firstPosition === "left"
      ? { team: first, position: assignment.firstPosition }
      : { team: second, position: assignment.secondPosition };
  const right =
    assignment.firstPosition === "right"
      ? { team: first, position: assignment.firstPosition }
      : { team: second, position: assignment.secondPosition };

  return (
    <div className="border-ink rounded-[14px] border p-5">
      <p className="text-muted-foreground text-[13px]">{MERGE_PREVIEW_LABEL}</p>
      <div className="mt-3.5 flex gap-2">
        <PreviewSeat occupant={left.team} position={left.position} />
        <PreviewSeat occupant={right.team} position={right.position} />
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <p className="text-muted-foreground min-w-0 flex-1 text-[13px]">
          {mergeSwapHint(second.occupant.name, assignment.firstPosition)}
        </p>
        <button
          type="button"
          onClick={onSwap}
          disabled={mergePending}
          className="min-h-11 min-w-11 shrink-0 text-[13px] font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {MERGE_SWAP_LABEL}
        </button>
      </div>
    </div>
  );
}

function PreviewSeat({
  occupant,
  position,
}: {
  occupant: HalfTeam;
  position: MergePositionAssignment["firstPosition"];
}) {
  const positionLabel =
    position === "left" ? LEFT_SEAT_LABEL : RIGHT_SEAT_LABEL;

  return (
    <div className="bg-ink text-paper flex h-16 min-h-16 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-3">
      <UserAvatar
        name={occupant.occupant.name}
        image={occupant.occupant.image}
        className="bg-dimrule text-paper size-[34px] shrink-0 rounded-[8px]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">{occupant.occupant.name}</span>
        <span className="text-dim text-[11px] leading-none">
          {positionLabel}
        </span>
      </span>
    </div>
  );
}
